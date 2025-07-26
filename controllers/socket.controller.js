import {
  addMessage,
  deleteMessage,
  updateMessage,
  getMessages,
  getMessageById,
  getAllMessageUser,
  changeStatus,
  updateMessageStatus,
} from "../db/queries.js";

const onlineUsers = new Map();
const pendingOffline = new Map();

export const setupSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("user_connected", async (user_id, receiver_id) => {
      try {
        if (!user_id) return;

        onlineUsers.set(user_id, socket.id);
        if (pendingOffline.has(user_id)) {
          clearTimeout(pendingOffline.get(user_id));
          pendingOffline.delete(user_id);
        }

        // Mark user as online in DB
        await changeStatus(user_id, true); 

      

        const messages = await getMessages(user_id, receiver_id);
        socket.emit("load_messages", messages);

        // Notify all clients about updated online users
        io.emit("online_users", Array.from(onlineUsers.keys()));
      } catch (error) {
        console.error("Error in user_connected:", error);
        socket.emit("connection_error", { message: "Failed to connect user" });
      }
    });

    socket.on("get_all_users", async (ack) => {
      try {
        const users = await getAllMessageUser();

        if (ack) ack(users);
      } catch (error) {
        console.error("Error fetching all users:", error);
        if (ack) ack({ error: "Failed to fetch users" });
      }
    });

    // Send message
    socket.on("send_message", async (data) => {
      const {
        receiver_id,
        user_id,
        content,
        file_url,
        ipAddress,
        response_to,
      } = data;

      try {
        const result = await addMessage(
          receiver_id,
          user_id,
          content,
          file_url,
          ipAddress,
          response_to || null // reply target, can be null
        );

        if (!result) {
          socket.emit("message_error", { message: "Failed to send message" });
          return;
        }

        const message = result;

        const receiverSocket = onlineUsers.get(receiver_id);

        if (!receiverSocket) {
          console.warn("Receiver is not online:", receiver_id);
        } else {
          io.to(receiverSocket).emit("receive_message", message);
          await updateMessageStatus(message.id, "delivered");
        }

        socket.emit("message_sent", message);
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("message_error", { message: "Server error occurred" });
      }
    });

    // Mark as read
    socket.on("mark_as_read", async ({ message_id }) => {
      const result = await updateMessageStatus(message_id, "read");
      console.log("Message marked as read:", result);
      if (!result) {
        console.error("Failed to mark message as read:", message_id);
        socket.emit("message_error", {
          message: "Failed to mark message as read",
        });
        return;
      }
      try {
        const senderId = result.user_id;
        const senderSocketId = onlineUsers.get(senderId);

        if (senderSocketId) {
          io.to(senderSocketId).emit("message_read", result);
          io.to(senderSocketId).emit("message_read_ack", result); // ✅ Send ack to sender
        }

        // Optional: also tell receiver that the operation succeeded
        socket.emit("read_status_updated", { success: true });
      } catch (err) {
        console.error("Error emitting read events:", err);
      }
    });

    // Update message
    socket.on(
      "edit_message",
      async ({ message_id, new_content, new_file_url }) => {
        const result = await updateMessage(
          message_id,
          new_content,
          new_file_url
        );

        const receiverSocket = onlineUsers.get(result.receiver_id);
        const senderSocket = onlineUsers.get(result.user_id);
        
        if (receiverSocket) {
          io.to(receiverSocket).emit("message_edited", result);
        }
        if (senderSocket) {
          io.to(senderSocket).emit("message_edited", result);
        }
      }
    );
    // Delete message
    socket.on("delete_message", async ({ message_id }) => {
      await deleteMessage(message_id);

      io.emit("message_deleted", { message_id });
    });

    socket.on("disconnect", async () => {
      const user_id = [...onlineUsers.entries()].find(
        ([_, sid]) => sid === socket.id
      )?.[0];

      if (user_id) {
        // Schedule delayed offline status update
        const timeout = setTimeout(async () => {
          onlineUsers.delete(user_id);
          pendingOffline.delete(user_id);

          await changeStatus(user_id, false);

          io.emit("online_users", Array.from(onlineUsers.keys()));
        }, 5000);

        pendingOffline.set(user_id, timeout);
      }

      console.log("Socket disconnected:", socket.id);
    });
  });
};
