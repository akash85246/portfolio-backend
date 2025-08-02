import { addView, updateViewsByIp, getTotalViews } from "../db/queries.js";

async function postView(req, res) {
  const { ip_address, user_id  } = req.body;
  console.log("Received view request:", { ip_address, user_id });

  if (!user_id && !ip_address) {
    return res.status(400).json({ error: "User ID and Post ID are required" });
  }

  try {
    const view = await addView(ip_address,user_id);
    return res.status(201).json(view);
  } catch (error) {
    console.error("Error adding view:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function updateView(req, res) {
  const { ip_address, user_id } = req.body;

  if (!ip_address || !user_id) {
    return res.status(400).json({ error: "IP address and User ID are required" });
  }

  try {
    const updatedView = await updateViewsByIp(ip_address, user_id);
    if (!updatedView) {
      return res.status(404).json({ error: "View not found or already updated" });
    }
    return res.status(200).json(updatedView);
  } catch (error) {
    console.error("Error updating view:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

function formatNumber(num) {
  if (num >= 1_000_000) {
    const formatted = (num / 1_000_000).toFixed(1);
    return formatted.length > 3 ? Math.round(num / 1_000_000) + 'M' : formatted + 'M';
  }
  if (num >= 1_000) {
    const formatted = (num / 1_000).toFixed(1);
    return formatted.length > 3 ? Math.round(num / 1_000) + 'K' : formatted + 'K';
  }
  return num.toString();
}
async function getTotalViewsCount(req, res) {
  try {
    const totalViews = await getTotalViews();
    const formatted = formatNumber(totalViews);
    return res.status(200).json({ total_views: formatted });
  } catch (error) {
    console.error("Error getting total views:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}



export { postView, updateView, getTotalViewsCount };