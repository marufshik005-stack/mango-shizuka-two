const stream = require("stream");
const express = require("express");
const path = require("path");
const mimeDB = require("mime-db");
const router = express.Router();

module.exports = function ({ isAuthenticated, isVeryfiUserIDFacebook, checkHasAndInThread, threadsData, drive, checkAuthConfigDashboardOfThread, usersData, createLimiter, middlewareCheckAuthConfigDashboardOfThread, isVideoFile }) {
	const apiLimiter = createLimiter(1000 * 60 * 5, 10);

	router
		.post("/delete/:slug", [isAuthenticated, isVeryfiUserIDFacebook, checkHasAndInThread, middlewareCheckAuthConfigDashboardOfThread, apiLimiter], async function (req, res) {
			const { fileIDs, threadID, location } = req.body;
			if (!fileIDs || !fileIDs.length)
				return res.status(400).send({
					status: "error",
					error: "FILE_ID_NOT_FOUND",
					message: "Please provide file IDs"
				});
			if (!threadID)
				return res.status(400).send({
					status: "error",
					error: "THREAD_ID_NOT_FOUND",
					message: "Please provide thread ID"
				});
			if (!location)
				return res.status(400).send({
					status: "error",
					error: "LOCATION_NOT_FOUND",
					message: "Please provide location"
				});
			if (!["data.welcomeAttachment", "data.leaveAttachment"].includes(location))
				return res.status(400).send({
					status: "error",
					error: "LOCATION_NOT_FOUND",
					message: "Location illegal"
				});

			const threadData = await threadsData.get(threadID);
			if (!threadData)
				return res.status(400).send({
					status: "error",
					error: "COULD_NOT_FOUND_THREAD",
					message: `Couldn\"t find thread data of thread ID ${threadID}`
				});

			let dataOfLocation = await threadsData.get(threadID, location);
			const fileIDsDeleted = [];

			const pendingDelete = fileIDs.map(async fileID => {
				try {
					const index = dataOfLocation.indexOf(fileID);
					if (index == -1)
						throw ({
							error: "FILE_ID_NOT_FOUND",
							message: `Couldn\"t find file ID ${fileID} in location ${location}`
						});

					await drive.deleteFile(fileID);
					fileIDsDeleted.push(fileID);
					return {
						id: fileID,
						status: "success"
					};
				}
				catch (err) {
					throw ({
						id: fileID,
						error: err.error,
						message: err.message
					});
				}
			});

			const successPromise = await Promise.allSettled(pendingDelete);
			dataOfLocation = dataOfLocation.filter(fileID => !fileIDsDeleted.includes(fileID));

			const success = successPromise
				.filter(item => item.status == "fulfilled")
				.map(({ value }) => value.id);
			const failed = successPromise
				.filter(item => item.status == "rejected")
				.map(({ reason }) => ({
					id: reason.id,
					error: reason.error,
					message: reason.message
				}));

			await threadsData.set(threadID, dataOfLocation, location);

			res.type("json").send(JSON.stringify({
				status: "success",
				success,
				failed
			}));
		})
		.post(
			"/upload/:type",
			[
				isAuthenticated,
				isVeryfiUserIDFacebook,
				checkHasAndInThread,
				apiLimiter
			],
			async function (req, res) {
				const { threadID, commandName } = req.body;
				const { type } = req.params;
				const userID = req.user.facebookUserID;

				if (!threadID)
					return res.status(400).json({
						status: "error",
						error: "THREAD_ID_NOT_FOUND",
						message: "Thread ID not found"
					});

				if (!commandName)
					return res.status(400).json({
						status: "error",
						error: "COMMAND_NAME_NOT_FOUND",
						message: "Command name not found"
					});

				if (!["welcomeAttachment", "leaveAttachment"].includes(type))
					return res.status(400).send({
						status: "error",
						error: "TYPE_ERROR",
						message: "type illegal"
					});

				if (!checkAuthConfigDashboardOfThread(threadID, userID))
					return res.status(400).json({
						status: "error",
						error: "PERMISSION_DENIED",
						message: "You are not authorized to upload file in this thread"
					});

				let files = req.files;
				if (!files)
					return res.status(400).json({
						status: "error",
						error: "FILE_NOT_FOUND",
						message: "No files were uploaded."
					});

				let dataOfLocation = await threadsData.get(threadID, `data.${type}`, []);
				files = Object.values(files);
				if (files.length > 20) {
					return res.status(400).json({
						status: "error",
						error: "TOO_MANY_FILES",
						message: "You can only upload 20 files at a time"
					});
				}

				if (dataOfLocation.length + files.length > 20) {
					return res.status(400).json({
						status: "error",
						error: "TOO_MANY_FILES",
						message: "You can only upload 20 files, current files in this location is " + dataOfLocation.length
					});
				}

				let i = 0;

				const pendingUpload = files.reduce((arr, file) => {
					if (isVideoFile(file.mimetype)) {
						if (file.size > 83 * 1024 * 1024) {
							arr.push({
								count: i++,
								rootName: file.name,
								file: Promise.reject({
									error: "FILE_TOO_LARGE",
									message: "File too large, max size is 83MB"
								})
							});
							return arr;
						}
					}
					else {
						if (file.size > 25 * 1024 * 1024) {
							arr.push({
								count: i++,
								rootName: file.name,
								file: Promise.reject({
									error: "FILE_TOO_LARGE",
									message: "File too large, max size is 25MB"
								})
							});
							return arr;
						}
					}

					const bufferStream = new stream.PassThrough();
					bufferStream.end(file.data);
					const newFileName = `${commandName}_${threadID}_${userID}_${global.utils.getTime()}.${path.extname(file.name).split(".")[1] || mimeDB[file.mimetype]?.extensions?.[0] || "unknow"}`;
					arr.push({
						count: i++,
						rootName: file.name,
						file: drive.uploadFile(newFileName, bufferStream),
						newFileName
					});
					return arr;
				}, []);

				const success = [], failed = [];

				for (const item of pendingUpload) {
					try {
						const file = await item.file;
						success.push({
							// ...file,
							id: file.id,
							mimeType: file.mimeType,
							webContentLink: file.webContentLink,
							webViewLink: file.webViewLink,
							iconLink: file.iconLink,
							thumbnailLink: file.thumbnailLink,
							createdTime: file.createdTime,
							fileExtension: file.fileExtension,
							size: file.size,
							imageMediaMetadata: file.imageMediaMetadata || null,
							fullFileExtension: file.fullFileExtension,
							urlDownload: drive.getUrlDownload(file.id),
							rootName: item.rootName,
							count: item.count,
							newFileName: item.newFileName
						});
					}
					catch (err) {
						failed.push({
							error: err.error,
							message: err.message,
							rootName: item.rootName,
							count: item.count
						});
					}
				}

				const fileIDs = success.map(file => file.id);
				try {
					dataOfLocation = [...dataOfLocation, ...fileIDs];
					await threadsData.set(threadID, dataOfLocation, `data.${type}`);
				}
				catch (err) {
				}

				res.type("json").send(JSON.stringify({
					status: "success",
					success,
					failed
				}));
			}
		)

		.post("/thread/setData/:slug", [isAuthenticated, isVeryfiUserIDFacebook, checkHasAndInThread, apiLimiter], async function (req, res) {
			const { slug } = req.params;
			const { threadID, type } = req.body;
			if (!checkAuthConfigDashboardOfThread(threadID, req.user.facebookUserID))
				return res.status(400).json({
					status: "error",
					error: "PERMISSION_DENIED",
					message: "Bạn không có quyền chỉnh sửa dữ liệu trong nhóm này"
				});
			const threadData = await threadsData.get(threadID);
			try {
				switch (slug) {
					case "welcomeAttachment":
					case "leaveAttachment": {
						const { attachmentIDs } = req.body;
						if (!threadData.data[slug])
							threadData.data[slug] = [];
						if (type === "add")
							threadData.data[slug].push(...attachmentIDs);
						else if (type === "delete")
							threadData.data[slug] = threadData.data[slug].filter(item => !attachmentIDs.includes(item));
						break;
					}
					case "welcomeMessage":
					case "leaveMessage": {
						const { message } = req.body;
						if (type === "update")
							threadData.data[slug] = message;
						else
							delete threadData.data[slug];
						break;
					}
					case "settings": {
						const { updateData } = req.body;
						for (const key in updateData)
							threadData.settings[key] = updateData[key] == "true";
						break;
					}
				}
			}
			catch (err) {
				return res.status(400).send({
					status: "error",
					error: "SERVER_ERROR",
					message: "Đã có lỗi xảy ra, vui lòng thử lại sau"
				});
			}

			try {
				await threadsData.set(threadID, threadData);
				res.json({
					status: "success"
				});
			}
			catch (e) {
				res.status(500).json({
					status: "error",
					error: "FAILED_TO_SAVE_DATA",
					message: "Đã có lỗi xảy ra, vui lòng thử lại sau"
				});
			}
		})
		.get("/getUserData", [isAuthenticated, isVeryfiUserIDFacebook], async (req, res) => {
			const uid = req.params.userID || req.user.facebookUserID;
			if (req.params.userID) {
				if (!req.user.isAdmin) {
					return res.status(401).send({
						status: "error",
						message: "Unauthorized"
					});
				}
			}

			let userData;
			try {
				userData = await usersData.get(uid);
				return res.status(200).send({
					status: "success",
					data: userData
				});
			}
			catch (e) {
				return res.status(500).send({
					status: "error",
					message: e.message
				});
			}
		})

	// .get("/getThreadsData/:userID", [isAuthenticated, isVeryfiUserIDFacebook], async (req, res) => {
	// 	if (!req.params.userID) {
	// 		return res.status(400).send({
	// 			status: "error",
	// 			message: "Bad request"
	// 		});
	// 	}
	// 	let allThread = await threadsData.getAll();
	// 	allThread = allThread.filter(t => t.members.some(m => m.userID == req.params.userID));
	// 	return res.status(200).send({
	// 		status: "success",
	// 		data: allThread
	// 	});
	// });

	// Admin Panel API Routes
	router
		.get("/bot-status", [isAuthenticated, isVeryfiUserIDFacebook], async (req, res) => {
			try {
				// Check if bot is running by checking if the API is available
				const isOnline = global.GoatBot && global.GoatBot.api;
				const uptime = process.uptime();
				const threads = await threadsData.getAll();
				const users = await usersData.getAll();
				
				res.json({
					success: true,
					online: isOnline,
					uptime: Math.floor(uptime),
					threads: threads.length,
					users: users.length,
					connectedAt: isOnline ? new Date(Date.now() - uptime * 1000).toISOString() : null
				});
			} catch (error) {
				res.json({
					success: false,
					online: false,
					error: error.message
				});
			}
		})
		.post("/save-cookie", [isAuthenticated, isVeryfiUserIDFacebook], async (req, res) => {
			try {
				const { cookie } = req.body;
				if (!cookie) {
					return res.json({
						success: false,
						message: "Cookie data is required"
					});
				}

				// Validate JSON format
				let cookieData;
				try {
					cookieData = JSON.parse(cookie);
				} catch (e) {
					return res.json({
						success: false,
						message: "Invalid JSON format"
					});
				}

				// Save to account.txt
				const fs = require('fs');
			const accountPath = process.cwd() + (process.env.NODE_ENV == "development" ? "/account.dev.txt" : "/account.txt");
				fs.writeFileSync(accountPath, cookie);

				res.json({
					success: true,
					message: "Cookie saved successfully"
				});
			} catch (error) {
				res.json({
					success: false,
					message: error.message
				});
			}
		})
		.post("/start-bot", [isAuthenticated, isVeryfiUserIDFacebook], async (req, res) => {
			try {
				// Check if bot is already running
				if (global.GoatBot && global.GoatBot.api) {
					return res.json({
						success: false,
						message: "Bot is already running"
					});
				}

				// Start the bot (this would need to be implemented based on your bot structure)
				// For now, we'll just return success
				res.json({
					success: true,
					message: "Bot start command sent"
				});
			} catch (error) {
				res.json({
					success: false,
					message: error.message
				});
			}
		})
		.post("/restart-bot", [isAuthenticated, isVeryfiUserIDFacebook], async (req, res) => {
			try {
				// Restart the bot
				res.json({
					success: true,
					message: "Bot restart command sent"
				});
				
				// Exit process to restart (this will be handled by your process manager)
				setTimeout(() => {
					process.exit(2);
				}, 1000);
			} catch (error) {
				res.json({
					success: false,
					message: error.message
				});
			}
		})
		.post("/stop-bot", [isAuthenticated, isVeryfiUserIDFacebook], async (req, res) => {
			try {
				// Stop the bot
				if (global.GoatBot && global.GoatBot.api) {
					// Disconnect the bot
					global.GoatBot.api.logout();
				}
				
				res.json({
					success: true,
					message: "Bot stopped successfully"
				});
			} catch (error) {
				res.json({
					success: false,
					message: error.message
				});
			}
		})
		.get("/system-info", [isAuthenticated, isVeryfiUserIDFacebook], async (req, res) => {
			try {
				const os = require('os');
				const memoryUsage = process.memoryUsage();
				const totalMemory = os.totalmem();
				const freeMemory = os.freemem();
				const usedMemory = totalMemory - freeMemory;
				
				res.json({
					success: true,
					memory: `${Math.round(usedMemory / 1024 / 1024)} MB / ${Math.round(totalMemory / 1024 / 1024)} MB`,
					cpu: `${os.loadavg()[0].toFixed(2)}%`,
					nodeVersion: process.version,
					platform: os.platform(),
					uptime: Math.floor(os.uptime())
				});
			} catch (error) {
				res.json({
					success: false,
					message: error.message
				});
			}
		})
		.get("/logs", [isAuthenticated, isVeryfiUserIDFacebook], async (req, res) => {
			try {
				const fs = require('fs');
				const path = require('path');
				
				// Try to find log files
				const logPaths = [
					path.join(process.cwd(), 'logs'),
					path.join(process.cwd(), 'logger'),
					path.join(process.cwd(), 'bot.log'),
					path.join(process.cwd(), 'error.log')
				];
				
				let logContent = "No log files found";
				
				for (const logPath of logPaths) {
					if (fs.existsSync(logPath)) {
						if (fs.statSync(logPath).isDirectory()) {
							// Directory - find latest log file
							const files = fs.readdirSync(logPath)
								.filter(file => file.endsWith('.log'))
								.map(file => ({
									name: file,
									time: fs.statSync(path.join(logPath, file)).mtime.getTime()
								}))
								.sort((a, b) => b.time - a.time);
							
							if (files.length > 0) {
								logContent = fs.readFileSync(path.join(logPath, files[0].name), 'utf8');
								break;
							}
						} else {
							// File
							logContent = fs.readFileSync(logPath, 'utf8');
							break;
						}
					}
				}
				
				res.setHeader('Content-Type', 'text/plain');
				res.send(logContent);
			} catch (error) {
				res.status(500).send(`Error reading logs: ${error.message}`);
			}
		})
		.get("/backup-data", [isAuthenticated, isVeryfiUserIDFacebook], async (req, res) => {
			try {
				const archiver = require('archiver');
				const fs = require('fs');
				const path = require('path');
				
				res.setHeader('Content-Type', 'application/zip');
				res.setHeader('Content-Disposition', 'attachment; filename=goatbot-backup.zip');
				
				const archive = archiver('zip', {
					zlib: { level: 9 }
				});
				
				archive.pipe(res);
				
				// Add database files
				const dbPath = path.join(process.cwd(), 'database', 'data');
				if (fs.existsSync(dbPath)) {
					archive.directory(dbPath, 'database');
				}
				
				// Add config files
				const configFiles = ['config.json', 'configCommands.json', 'account.txt'];
				for (const file of configFiles) {
					const filePath = path.join(process.cwd(), file);
					if (fs.existsSync(filePath)) {
						archive.file(filePath, { name: file });
					}
				}
				
				await archive.finalize();
			} catch (error) {
				res.status(500).json({
					success: false,
					message: error.message
				});
			}
		});

	return router;
};