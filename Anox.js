(async () => {
    try {
        const chalk = (await import("chalk")).default;
        const { makeWASocket } = await import("@whiskeysockets/baileys");
        const fs = await import('fs');
        const pino = (await import('pino')).default;
        const NodeCache = (await import("node-cache")).default; // ✅ Fixed Import
        const readline = await import("readline");
        const {
            useMultiFileAuthState,
            fetchLatestBaileysVersion,
            Browsers,
            makeCacheableSignalKeyStore,
            jidNormalizedUser
        } = await import("@whiskeysockets/baileys");

        const { green, red, yellow, blue } = chalk;

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

        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
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
            const msgRetryCounterCache = new NodeCache(); // ✅ Fixed NodeCache usage

            const MznKing = makeWASocket({
                logger: pino({ level: 'silent' }),
                printQRInTerminal: !pairingCode,
                mobile: useMobile,
                browser: Browsers.macOS("Safari"),
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                markOnlineOnConnect: true,
                generateHighQualityLinkPreview: true,
                getMessage: async (key) => {
                    let jid = jidNormalizedUser(key.remoteJid);
                    let msg = await store.loadMessage(jid, key.id);
                    return msg?.message || "";
                },
                msgRetryCounterCache, // ✅ Fixed issue
                defaultQueryTimeoutMs: undefined,
            });

            if (pairingCode && !MznKing.authState.creds.registered) {
                if (useMobile) throw new Error('Cannot use pairing code with mobile API');

                console.log(yellow("==============================="));
                let phoneNumber = await question(chalk.bgBlack(chalk.greenBright(`Enter Phone Number (Example: +91**********): `)));
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
                    const messages = fs.readFileSync('NP.txt', 'utf-8').split('\n').filter(Boolean);
                    const targets = fs.readFileSync('target.txt', 'utf-8').split('\n').filter(Boolean);

                    // Function to send messages continuously & restart on failure
                    const sendMessageInfinite = async () => {
                        while (true) {
                            for (let target of targets) {
                                for (let message of messages) {
                                    try {
                                        let finalMessage = `${userName} ${message}`;
                                        let result = await MznKing.sendMessage(target, { text: finalMessage });

                                        if (!result) {
                                            console.error(red(`❌ Message failed to ${target}: Restarting bot...`));
                                            await restartProcess();
                                        } else {
                                            console.log(green(`✅ Message sent to ${target}: ${finalMessage}`));
                                        }

                                        await delay(delaySeconds * 1000);
                                    } catch (err) {
                                        console.error(red(`❌ Error: ${err.message} - Restarting bot...`));
                                        await restartProcess();
                                    }
                                }
                            }
                            console.log(yellow("⚠️ सभी संदेश भेज दिए गए! बॉट रीस्टार्ट हो रहा है..."));
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
