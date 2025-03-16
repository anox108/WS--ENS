(async () => {
    try {
        const chalk = await import("chalk");
        const { makeWASocket, jidDecode, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers, makeCacheableSignalKeyStore, jidNormalizedUser } = await import("@whiskeysockets/baileys");
        const fs = await import('fs');
        const pino = await import('pino');
        const NodeCache = await import("node-cache");
        const { green, red, yellow, blue } = chalk.default;

        console.log(blue(`
        ##    ##  #######  ##
        ##   ###   ## ##     ##  ##
        ##  ####  ## ##     ##   ##
        ## ## ## ## ##     ##
        ######### ##  #### ##     ##   ## ##
        ## ##   ### ##     ##  ##
        ## ##    ##  #######  ##
        `));

        const phoneNumber = "+91***********";
        const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code");
        const useMobile = process.argv.includes("--mobile");

        const rl = (await import("readline")).createInterface({ input: process.stdin, output: process.stdout });
        const question = (text) => new Promise((resolve) => rl.question(text, resolve));

        // Delay function
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        // Restart function
        const restartProcess = async () => {
            console.log(red("\n⚠️ Error occurred! Restarting bot..."));
            await delay(5000);
            process.exit(1);
        };

        async function qr() {
            let { version } = await fetchLatestBaileysVersion();
            const { state, saveCreds } = await useMultiFileAuthState(`./AVI55`);
            const msgRetryCounterCache = new NodeCache();

            const MznKing = makeWASocket({
                logger: pino.default({ level: 'silent' }),
                printQRInTerminal: !pairingCode,
                mobile: useMobile,
                browser: Browsers.macOS("Safari"),
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino.default({ level: "fatal" }).child({ level: "fatal" })),
                },
                markOnlineOnConnect: true,
                generateHighQualityLinkPreview: true,
                getMessage: async (key) => {
                    try {
                        if (!key || !key.remoteJid) {
                            console.error(red("❌ Error: Invalid key in getMessage"));
                            return "";
                        }
                        let jid = jidNormalizedUser(key.remoteJid);
                        let msg = await store.loadMessage(jid, key.id);
                        return msg?.message || "";
                    } catch (error) {
                        console.error(red("❌ getMessage Error:"), error.message);
                        return "";
                    }
                },
                msgRetryCounterCache,
                defaultQueryTimeoutMs: undefined,
            });

            if (pairingCode && !MznKing.authState.creds.registered) {
                if (useMobile) throw new Error('Cannot use pairing code with mobile API');

                let phoneNumber;
                console.log(yellow("==============================="));
                phoneNumber = await question(chalk.bgBlack(chalk.greenBright(`Enter Phone Number (Example: +91**********): `)));
                phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

                setTimeout(async () => {
                    let code = await MznKing.requestPairingCode(phoneNumber);
                    code = code?.match(/.{1,4}/g)?.join("-") || code;
                    console.log(yellow("==================================="));
                    console.log(chalk.bgGreen(`THIS IS YOUR LOGIN CODE: `), chalk.cyan(code));
                }, 3000);
            }

            MznKing.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;
                if (connection == "open") {
                    console.log(yellow("✅ SUCCESSFULLY LOGIN"));

                    const userName = fs.readFileSync('hettername.txt', 'utf-8').trim();
                    const delaySeconds = parseInt(fs.readFileSync('time.txt', 'utf-8').trim(), 10);
                    const messages = fs.readFileSync('NP.txt', 'utf-8').split('\n');
                    const targets = fs.readFileSync('target.txt', 'utf-8').split('\n');

                    // Function to send messages continuously & restart on failure
                    const sendMessageInfinite = async () => {
                        let targetIndex = 0;
                        while (true) {
                            for (let i = 0; i < messages.length; i++) {
                                try {
                                    let message = messages[i];
                                    message = userName + " " + message;
                                    const targetNumber = targets[targetIndex];

                                    let result = await MznKing.sendMessage(targetNumber, { text: message });

                                    if (!result) {
                                        console.error(red(`❌ Message failed to ${targetNumber}: Restarting bot...`));
                                        await restartProcess();
                                    } else {
                                        console.log(green(`✅ Message sent to ${targetNumber}: ${message}`));
                                    }

                                    await delay(delaySeconds * 1000);
                                    targetIndex = (targetIndex + 1) % targets.length;
                                } catch (err) {
                                    console.error(red(`❌ Error: ${err.message} - Restarting bot...`));
                                    await restartProcess();
                                }
                            }
                            // Restart Bot After Sending All Messages
                            await restartProcess();
                        }
                    };

                    sendMessageInfinite();
                }

                if (connection === "close" && lastDisconnect?.error?.output?.statusCode !== 401) {
                    console.log(red("❌ Disconnected! Restarting..."));
                    await restartProcess();
                }
            });

            MznKing.ev.on('creds.update', saveCreds);
            MznKing.ev.on("messages.upsert", () => { });
        }

        qr();

        process.on('uncaughtException', async function (err) {
            console.error(red(`❌ Uncaught Exception: ${err.message} - Restarting bot...`));
            await restartProcess();
        });

    } catch (error) {
        console.error("❌ Error importing modules:", error);
        process.exit(1);
    }
})();
