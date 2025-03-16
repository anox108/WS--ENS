(async () => {
    try {
        const chalk = await import("chalk");
        const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers, makeCacheableSignalKeyStore, jidNormalizedUser } = await import("@whiskeysockets/baileys");
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

        const rl = (await import("readline")).createInterface({ input: process.stdin, output: process.stdout });
        const question = (text) => new Promise((resolve) => rl.question(text, resolve));

        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        async function restartProcess() {
            console.log(red("\n⚠️ सभी संदेश भेज दिए गए! बॉट रीस्टार्ट हो रहा है..."));
            await delay(5000);
            process.exit(1);
        }

        async function startBot() {
            let { version } = await fetchLatestBaileysVersion();
            const { state, saveCreds } = await useMultiFileAuthState(`./AVI55`);
            const msgRetryCounterCache = new NodeCache();

            const MznKing = makeWASocket({
                logger: pino.default({ level: 'silent' }),
                printQRInTerminal: true,
                browser: Browsers.macOS("Safari"),
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino.default({ level: "fatal" }).child({ level: "fatal" })),
                },
                markOnlineOnConnect: true,
                generateHighQualityLinkPreview: true,
                msgRetryCounterCache,
                defaultQueryTimeoutMs: undefined,
            });

            MznKing.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;
                if (connection == "open") {
                    console.log(yellow("✅ सफलतापूर्वक लॉगिन हो गया!"));

                    const userName = fs.readFileSync('hettername.txt', 'utf-8').trim();
                    const delaySeconds = parseInt(fs.readFileSync('time.txt', 'utf-8').trim(), 10);
                    let messages = fs.readFileSync('NP.txt', 'utf-8').split('\n').filter(msg => msg.trim() !== "");
                    const targets = fs.readFileSync('target.txt', 'utf-8').split('\n').filter(num => num.trim() !== "");

                    if (messages.length === 0 || targets.length === 0) {
                        console.error(red("❌ संदेश या नंबर लिस्ट खाली है!"));
                        return;
                    }

                    // **हर बार अलग-अलग मैसेज भेजना**
                    const sendMessages = async () => {
                        for (const target of targets) {
                            for (const message of messages) {
                                try {
                                    let finalMessage = `${userName} ${message}`;
                                    let result = await MznKing.sendMessage(target, { text: finalMessage });

                                    if (!result) {
                                        console.error(red(`❌ ${target} को मैसेज भेजने में समस्या!`));
                                    } else {
                                        console.log(green(`✅ ${target} को भेजा: ${finalMessage}`));
                                    }

                                    await delay(delaySeconds * 1000);
                                } catch (err) {
                                    console.error(red(`❌ त्रुटि: ${err.message}`));
                                }
                            }
                        }

                        // **सभी मैसेज पूरे भेजने के बाद रीस्टार्ट**
                        await restartProcess();
                    };

                    sendMessages();
                }

                if (connection === "close" && lastDisconnect?.error?.output?.statusCode !== 401) {
                    console.log(red("❌ डिस्कनेक्ट हो गया! पुनः कनेक्ट करने का प्रयास..."));
                    await restartProcess();
                }
            });

            MznKing.ev.on('creds.update', saveCreds);
            MznKing.ev.on("messages.upsert", () => { });
        }

        startBot();

        process.on('uncaughtException', async function (err) {
            console.error(red(`❌ अप्रत्याशित त्रुटि: ${err.message} - बॉट रीस्टार्ट हो रहा है...`));
            await restartProcess();
        });

    } catch (error) {
        console.error("❌ मॉड्यूल लोड करने में त्रुटि:", error);
        process.exit(1);
    }
})();
