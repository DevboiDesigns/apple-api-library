import axios from "axios"
import { AppleStoreKitToken } from "../utils/app.store.token.util"
import { APP_APPLE_ID } from "../config/env.keys"

export class AppStoreConnectLib {}

export class AppStoreBetaTesterLib {
  private token = AppleStoreKitToken.token("connect") // Your JWT generator
  constructor() {
    if (!this.token) {
      throw new Error("Failed to generate App Store Connect token")
    }
  }

  /**
   * * Add a tester to a beta group by group name.
   * @param groupName Name of the beta group
   * @param email Email address of the tester
   * @param firstName First name of the tester
   * @param lastName Last name of the tester
   */
  addTesterToGroupByName = async (
    groupName: string,
    email: string,
    firstName?: string,
    lastName?: string
  ) => {
    const groupId = await this.getBetaGroupIdByName(groupName)
    if (!groupId) {
      throw new Error(`Beta group "${groupName}" not found`)
    }
    await this.addTesterToGroup(groupId, email, firstName, lastName)
  }

  // Get all beta groups for the app
  getBetaGroups = async () => {
    console.log("Fetching beta groups for APP_APPLE_ID:", APP_APPLE_ID)
    const res = await axios.get(
      `https://api.appstoreconnect.apple.com/v1/apps/${APP_APPLE_ID}/betaGroups`,
      {
        headers: { Authorization: `Bearer ${this.token}` },
      }
    )
    // console.log("Beta groups response:", res.data)
    return res.data.data // Array of groups
  }

  // Get beta group ID by group name
  getBetaGroupIdByName = async (groupName: string) => {
    const groups = await this.getBetaGroups()
    // console.log(
    //   "Available groups:",
    //   groups.map((g: any) => g.attributes.name)
    // )
    const group = groups.find((g: any) => g.attributes.name === groupName)
    if (!group) {
      console.error(`Group "${groupName}" not found.`)
    }
    return group ? group.id : null
  }

  // List all testers in a specific beta group
  getBetaTestersInGroup = async (betaGroupId: string) => {
    const url = `https://api.appstoreconnect.apple.com/v1/betaGroups/${betaGroupId}/betaTesters`
    console.log("Fetching testers in group:", url)
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${this.token}` },
    })
    // console.log("Testers in group response:", res.data)
    return res.data.data // Array of testers in the group
  }

  // List all testers (across all groups), paginated
  getBetaTesters = async (nextUrl?: string) => {
    const url =
      nextUrl ||
      `https://api.appstoreconnect.apple.com/v1/betaTesters?limit=200`
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${this.token}` },
    })
    return res.data // returns { data, links }
  }

  // Fetch all testers across all pages
  getAllBetaTesters = async () => {
    let testers: any[] = []
    let nextUrl: string | undefined = undefined
    do {
      const res = await this.getBetaTesters(nextUrl)
      testers = testers.concat(res.data)
      nextUrl = res.links && res.links.next ? res.links.next : undefined
    } while (nextUrl)
    return testers
  }

  /**
   * * Add a tester to a beta group.
   * If the tester does not exist, they will be created.
   * If the tester already exists, they will be added to the group.
   * @param betaGroupId
   * @param email
   * @param firstName
   * @param lastName
   */
  addTesterToGroup = async (
    betaGroupId: string,
    email: string,
    firstName?: string,
    lastName?: string
  ) => {
    let testerId: string | null = null
    let operationComplete = false

    try {
      // 1. Create the tester if they don't exist
      // Note: Apple requires either betaGroups or builds relationship when creating a tester
      // We'll create the tester with the betaGroups relationship included
      const createRes = await axios.post(
        `https://api.appstoreconnect.apple.com/v1/betaTesters`,
        {
          data: {
            type: "betaTesters",
            attributes: {
              email,
              ...(firstName ? { firstName } : {}),
              ...(lastName ? { lastName } : {}),
            },
            relationships: {
              betaGroups: {
                data: [{ type: "betaGroups", id: betaGroupId }],
              },
            },
          },
        },
        { headers: { Authorization: `Bearer ${this.token}` } }
      )
      testerId = createRes.data.data.id
      console.log(
        `Created tester with id: ${testerId} for email: ${email} and added to group ${betaGroupId}`
      )
      // If tester was created with the relationship, they're already in the group
      operationComplete = true
    } catch (err: any) {
      // Check if this is a "relationship required" error vs "tester already exists"
      const errorData = err.response?.data
      const errorDetail = errorData?.errors?.[0]?.detail || ""
      const isRelationshipError =
        errorDetail.includes("relationship is required") ||
        errorDetail.includes("betaGroups or builds")

      // Handle 409 errors - could be "tester already exists" or "relationship required"
      // In both cases, we need to find the tester ID
      if (err.response && err.response.status === 409) {
        if (isRelationshipError) {
          console.log(
            `Relationship required error (409) - tester may already exist. Attempting to find tester ID for email: ${email}`
          )
        } else {
          console.log(
            `Tester already exists (409). Attempting to find tester ID for email: ${email}`
          )
        }

        // Strategy 1: Try to extract tester ID from error response
        // Apple sometimes includes the existing resource in the error response
        if (errorData) {
          // Check for existingResources in meta
          if (errorData.errors?.[0]?.meta?.existingResources) {
            const existingResources = errorData.errors[0].meta.existingResources
            if (
              Array.isArray(existingResources) &&
              existingResources.length > 0
            ) {
              testerId = existingResources[0].id
              console.log(
                `Found tester ID from error response meta: ${testerId} for email: ${email}`
              )
            }
          }

          // Check for included resources (Apple sometimes includes related resources)
          if (!testerId && errorData.included) {
            const testerResource = errorData.included.find(
              (r: any) =>
                r.type === "betaTesters" && r.attributes?.email === email
            )
            if (testerResource) {
              testerId = testerResource.id
              console.log(
                `Found tester ID from error response included: ${testerId} for email: ${email}`
              )
            }
          }

          // Log full error response for debugging if we still don't have an ID
          if (!testerId) {
            const errorJson = JSON.stringify(errorData, null, 2);
            const errorJsonTruncated =
              errorJson.length > 500 ? errorJson.substring(0, 500) + "..." : errorJson;
            console.log(
              `Error response structure (for debugging):`,
              errorJsonTruncated
            )
          }
        }

        // Strategy 2: Try to fetch tester by email using filter
        if (!testerId) {
          console.log(`Attempting to fetch tester by email filter...`)
          const tester = await this.getBetaTesterByEmail(email)
          testerId = tester ? tester.id : null
          if (testerId) {
            console.log(
              `Found tester ID via email filter: ${testerId} for email: ${email}`
            )
          }
        }

        // Strategy 3: Fallback - search through all testers (with pagination)
        if (!testerId) {
          console.log(
            `Email filter failed. Attempting to search all testers for email: ${email}`
          )
          try {
            const allTesters = await this.getAllBetaTesters()
            const tester = allTesters.find(
              (t: any) =>
                t.attributes?.email &&
                t.attributes.email.toLowerCase() === email.toLowerCase()
            )
            testerId = tester ? tester.id : null
            if (testerId) {
              console.log(
                `Found tester ID via full search: ${testerId} for email: ${email}`
              )
            } else {
              console.log(
                `Tester not found in ${allTesters.length} total testers for email: ${email}`
              )
            }
          } catch (searchErr: any) {
            console.error(
              `Error searching all testers:`,
              searchErr.response?.data || searchErr
            )
          }
        }

        if (!testerId) {
          console.error(
            `Could not find tester ID. Error response:`,
            JSON.stringify(err.response?.data, null, 2)
          )
          throw new Error(
            `Tester with email ${email} already exists but could not be found. This may be due to API delays or permissions issues.`
          )
        }

        console.log(
          `Tester already exists. Using id: ${testerId} for email: ${email}`
        )
      } else {
        console.error("Error creating tester:", err.response?.data || err)
        throw err
      }
    }
    if (!testerId) throw new Error("Tester not found or could not be created")

    // 2. Check if tester is already in the group to avoid unnecessary API calls
    if (!operationComplete) {
      try {
        const currentTesters = await this.getBetaTestersInGroup(betaGroupId)
        const alreadyInGroup = currentTesters.some(
          (t: any) => t.id === testerId
        )
        if (alreadyInGroup) {
          console.log(
            `Tester ${testerId} (${email}) is already in group ${betaGroupId}. Skipping add.`
          )
          operationComplete = true
        }
      } catch (checkErr: any) {
        // If we can't check, proceed with adding anyway
        console.log(
          `Could not verify if tester is in group, proceeding with add:`,
          checkErr.message
        )
      }
    }

    // 3. Add tester to group using the documented endpoint
    if (!operationComplete) {
      const url = `https://api.appstoreconnect.apple.com/v1/betaGroups/${betaGroupId}/relationships/betaTesters`
      try {
        await axios.post(
          url,
          {
            data: [{ type: "betaTesters", id: testerId }],
          },
          { headers: { Authorization: `Bearer ${this.token}` } }
        )
        console.log(
          `Successfully added tester ${testerId} (${email}) to group ${betaGroupId}`
        )
        operationComplete = true
      } catch (err: any) {
        // Handle different error scenarios
        if (err.response) {
          const status = err.response.status
          const errorData = err.response.data

          // 409 Conflict - tester might already be in group (race condition)
          if (status === 409) {
            // Double-check if tester is now in the group
            try {
              const currentTesters = await this.getBetaTestersInGroup(
                betaGroupId
              )
              const nowInGroup = currentTesters.some(
                (t: any) => t.id === testerId
              )
              if (nowInGroup) {
                console.log(
                  `Tester ${testerId} (${email}) is now in group ${betaGroupId} (race condition resolved).`
                )
                operationComplete = true
              }
            } catch (checkErr) {
              // Ignore check errors
            }

            // If still not in group, log the error details
            if (!operationComplete) {
              console.error(
                `409 Conflict when adding tester to group. Error details:`,
                JSON.stringify(errorData, null, 2)
              )
              throw new Error(
                `Failed to add tester ${email} to group: Conflict (409). The tester may already be in the group or there may be a permissions issue. Error: ${JSON.stringify(
                  errorData
                )}`
              )
            }
          } else if (status === 404) {
            // 404 Not Found - group or tester doesn't exist
            throw new Error(
              `Failed to add tester ${email} to group: Group (${betaGroupId}) or tester (${testerId}) not found (404).`
            )
          } else if (status === 403) {
            // 403 Forbidden - permissions issue
            throw new Error(
              `Failed to add tester ${email} to group: Permission denied (403). Check your API key permissions.`
            )
          } else {
            // Other errors
            console.error(
              `Error adding tester to group (${status}):`,
              JSON.stringify(errorData, null, 2)
            )
            throw new Error(
              `Failed to add tester ${email} to group: ${status} ${
                errorData?.errors?.[0]?.detail ||
                errorData?.errors?.[0]?.title ||
                "Unknown error"
              }`
            )
          }
        } else {
          // Network or other errors
          console.error("Error adding tester to group:", err.message || err)
          throw new Error(
            `Failed to add tester ${email} to group: ${
              err.message || "Unknown error"
            }`
          )
        }
      }
    }
  }

  // Remove a tester from a group
  removeTesterFromGroup = async (betaGroupId: string, testerId: string) => {
    await axios.delete(
      `https://api.appstoreconnect.apple.com/v1/betaGroups/${betaGroupId}/relationships/betaTesters`,
      {
        headers: { Authorization: `Bearer ${this.token}` },
        data: { data: [{ type: "betaTesters", id: testerId }] },
      }
    )
  }

  /**
   * * Update the "Public Testing" beta group to match a new list of email addresses.
   * @param emails Array of email addresses to update in the "Public Testing" group.
   */
  updatePublicTestingGroup = async (emails: string[]) => {
    const groupId = await this.getBetaGroupIdByName("Public Testing")
    if (!groupId) throw new Error("Public Testing group not found")

    // Get current testers in the group
    const currentTesters = await this.getBetaTestersInGroup(groupId)
    const currentEmails = currentTesters.map((t: any) => t.attributes.email)

    // Add new testers
    for (const email of emails) {
      if (!currentEmails.includes(email)) {
        await this.addTesterToGroup(groupId, email)
      }
    }

    // Remove testers not in the new list
    for (const tester of currentTesters) {
      if (!emails.includes(tester.attributes.email)) {
        await this.removeTesterFromGroup(groupId, tester.id)
      }
    }
  }

  // Fetch a tester by email using the filter endpoint
  getBetaTesterByEmail = async (email: string) => {
    try {
      // Try exact match first
      const url = `https://api.appstoreconnect.apple.com/v1/betaTesters?filter[email]=${encodeURIComponent(
        email
      )}`
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${this.token}` },
      })

      if (res.data.data && res.data.data.length > 0) {
        return res.data.data[0]
      }

      // If no exact match, try case-insensitive search through results
      // Note: Apple's API filter is case-sensitive, so we may need to search manually
      return null
    } catch (err: any) {
      console.error(
        `Error fetching tester by email ${email}:`,
        err.response?.data || err.message
      )
      return null
    }
  }
}

//**************** TEST SETUP ***********************/
// Usage example: update "Public Testing" group to match a new email list
// ;(async () => {
//   const service = new AppStoreBetaTesterLib()
//   await service.addTesterToGroupByName(
//     "Public Testing",
//     "sara@gmail.com",
//     "Christopher",
//     "Infinity"
//   )
// })()
