import { GraphQLClient, gql } from "graphql-request";

const getLeetStats = async (req, res) => {
  const endpoint = "https://leetcode.com/graphql";
  const username = process.env.LEETCODE_USER;

  const query = gql`
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          realName
          ranking
          reputation
          userAvatar
          countryName
        }
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
            submissions
          }
        }
        userCalendar {
          submissionCalendar
        }
      }
    }
  `;

  const client = new GraphQLClient(endpoint);

  try {
    
    const data = await client.request(query, { username });
  
    res.status(200).json(data);
  } catch (err) {
    console.error("LeetCode Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch LeetCode stats." });
  }
};

export default {
  getLeetStats,
};
