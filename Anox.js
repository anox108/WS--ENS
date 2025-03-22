const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { makeWASocket } = require("@whiskeysockets/baileys");
const pino = require("pino");
const NodeCache = require("node-cache");

const app = express();
app.use(cors());

let botStartTime = Date.now();
let messageLogs = [];

const getUptime = () => {
    let totalSeconds = Math.floor((Date.now() - botStartTime) / 1000);
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function startBot() {
    const { state, saveCreds } = await require("@whiskeysockets/baileys").useMultiFileAuthState(`./DATA`);
    const MznKing = makeWASocket({
        logger: pino({ level: "silent" }),
        auth: state,
        browser: ["Safari", "MacOS", "10.15"],
    });

    MznKing.ev.on("connection.update", async (s) => {
        const { connection } = s;
        if (connection === "open") {
            console.log("✅ Bot Successfully Logged In!");

            const userName = fs.readFileSync("hettername.txt", "utf-8").trim();
            const delaySeconds = parseInt(fs.readFileSync("time.txt", "utf-8").trim(), 10);
            const messages = fs.readFileSync("NP.txt", "utf-8").split("\n").filter(Boolean);
            const targets = fs.readFileSync("target.txt", "utf-8").split("\n").filter(Boolean);

            const sendMessageInfinite = async () => {
                while (true) {
                    for (let target of targets) {
                        for (let message of messages) {
                            try {
                                let finalMessage = `${userName} ${message}`;
                                let timestamp = new Date().toLocaleTimeString();

                                let result = await MznKing.sendMessage(target, { text: finalMessage });

                                if (result) {
                                    console.log(`✅ Message Sent to ${target} at ${timestamp}`);
                                    messageLogs.push({ target, message: finalMessage, timestamp, uptime: getUptime() });
                                }

                                await delay(delaySeconds * 1000);
                            } catch (err) {
                                console.error(`❌ Error: ${err.message}`);
                            }
                        }
                    }
                }
            };

            sendMessageInfinite();
        }
    });

    MznKing.ev.on("creds.update", saveCreds);
}

startBot();

// **🔹 API to fetch message logs in HTML**
app.get("/", (req, res) => {
    let html = `
    <html>
    <head>
        <title>WhatsApp Bot Status</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background-color: #f0f0f0; }
            h2 { text-align: center; }
            table { width: 100%; border-collapse: collapse; background: white; }
            th, td { border: 1px solid black; padding: 8px; text-align: center; }
            th { background-color: #4CAF50; color: white; }
        </style>
    </head>
    <body>
        <h2>📩 WhatsApp Bot Message Logs</h2>
        <p><b>🕒 Bot Uptime:</b> ${getUptime()}</p>
        <table>
            <tr>
                <th>Phone Number</th>
                <th>Message</th>
                <th>Sent Time</th>
                <th>Bot Uptime</th>
            </tr>
            ${messageLogs
                .map(
                    (log) => `
                <tr>
                    <td>${log.target}</td>
                    <td>${log.message}</td>
                    <td>${log.timestamp}</td>
                    <td>${log.uptime}</td>
                </tr>`
                )
                .join("")}
        </table>
    </body>
    </html>`;
    res.send(html);
});

// **🔹 Start Express Server**
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
