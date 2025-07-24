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

export const setupSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("user_connected", async (user_id, receiver_id) => {
      try {
        if (!user_id) return;

        onlineUsers.set(user_id, socket.id);

        // Mark user as online in DB
        await changeStatus(user_id, true); // true = online

        // Fetch and send message history to this user
        console.log(user_id, receiver_id);
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

        if (ack) ack(users); // Send the data back via callback
      } catch (error) {
        console.error("Error fetching all users:", error);
        if (ack) ack({ error: "Failed to fetch users" });
      }
    });

    // Send message
    socket.on("send_message", async (data) => {
      const { receiver_id, user_id, content, fileUrl, ipAddress } = data;

      const result = await addMessage(
        receiver_id,
        user_id,
        content,
        fileUrl,
        ipAddress
      );

      if (!result) {
        socket.emit("message_error", { message: "Failed to send message" });
        return;
      }

      const message = result;

      const receiverSocket = onlineUsers.get(receiver_id);
      console.log("Online Users Map:", [...onlineUsers.entries()]);
      console.log("Message sent:", message, receiverSocket, receiver_id);

      if (!receiverSocket) {
        console.warn("Receiver is not online:", receiver_id);
      }
      if (receiverSocket) {
        io.to(receiverSocket).emit("receive_message", message);
        await updateMessageStatus(message.id, "delivered");
      }

      socket.emit("message_sent", message);
    });

    // Mark as read
    socket.on("mark_as_read", async ({ message_id }) => {
      const result = await updateMessageStatus(message_id, "read");
      if (!result) {
        socket.emit("message_error", {
          message: "Failed to mark message as read",
        });
        return;
      }
      socket.emit("message_read_ack", result);
    });

    // Edit message
    socket.on("edit_message", async ({ message_id, new_content }) => {
      const result = await updateMessage(message_id, new_content);

      io.emit("message_edited", result.rows[0]);
    });

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
        onlineUsers.delete(user_id);
        await changeStatus(user_id); //set user as offline in the database
        io.emit("online_users", Array.from(onlineUsers.keys()));
      }
      console.log("Socket disconnected:", socket.id);
    });
  });
};
