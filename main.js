//Check SingleInstance
const { app } = require('electron');
const gotTheLock = app.requestSingleInstanceLock();
if(!gotTheLock) {
	app.exit();
}

	// initialize your app
const clientVersion = 220;
const https = require("https");
const { BrowserWindow, dialog, shell, Tray, Menu, MenuItem, Notification, session, protocol } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const options = {}; //{ extraHeaders: 'pragma: no-cache\n' };
const ProgressBar = require('electron-progressbar');
const jsonLocalStorage = require('electron-json-storage');
// const DownloadManager = require('electron-download-manager');
const fs = require('fs');
const { version } = require('os');
const { Console } = require('console');
const { setTimeout } = require('timers');

const CONFIG_FOLDER_NAME = "CustomFartix";

function setupRuleInterceptor() {
  const configDir = path.join(app.getPath("appData"), CONFIG_FOLDER_NAME);
  const rulesPath = path.join(configDir, "rules.json");
  const SWF_CONTENT_TYPE = "application/x-shockwave-flash";

  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

  if (!fs.existsSync(rulesPath)) {
    fs.writeFileSync(
      rulesPath,
      JSON.stringify(
        {
          _INSTRUCTIONS: "Replace example.swf with the URL to intercept",
          "example.swf": "/absolute/path/to/your/custom/file.swf",
        },
        null,
        2,
      ),
    );
  }

  let rules = [];

  const reloadRules = () => {
    try {
      if (!fs.existsSync(rulesPath)) return;
      const parsed = JSON.parse(fs.readFileSync(rulesPath, "utf8"));
      rules = Object.entries(parsed)
        .filter(
          ([urlMatch, localPath]) =>
            urlMatch && localPath && !urlMatch.startsWith("_"),
        )
        .map(([urlMatch, localPath]) => ({ urlMatch, localPath }));
      console.log(`[Interceptor] Loaded ${rules.length} rules.`);
    } catch (err) {
      console.error("[Interceptor] Rules error:", err.message);
    }
  };

  reloadRules();
  fs.watch(rulesPath, (eventType) => {
    if (eventType === "change") reloadRules();
  });

  protocol.interceptStreamProtocol("https", (request, callback) => {
    const rule = rules.find(
      (r) => request.url.includes(r.urlMatch) && fs.existsSync(r.localPath),
    );

    if (rule) {
      console.log(`[In-Place Replacement] ${request.url} -> ${rule.localPath}`);
      return callback({
        statusCode: 200,
        headers: {
          "content-type": SWF_CONTENT_TYPE,
          "access-control-allow-origin": "*",
          "cache-control": "no-cache, no-store",
        },
        data: fs.createReadStream(rule.localPath),
      });
    }

    // Passthrough using Node's native https module (bypasses Chromium stack).
    const parsedUrl = new URL(request.url);
    const proxyReq = https.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: request.method,
        headers: request.headers,
      },
      (proxyRes) => {
        callback({
          statusCode: proxyRes.statusCode,
          headers: proxyRes.headers,
          data: proxyRes,
        });
      },
    );

    proxyReq.on("error", (err) => {
      console.error(`[Passthrough Error] ${request.url} - ${err.message}`);
      callback({ statusCode: 500 });
    });

    if (request.uploadData) {
      request.uploadData.forEach((part) => {
        if (part.bytes) proxyReq.write(part.bytes);
      });
    }
    proxyReq.end();
  });
}

app.whenReady().then(() => {
  setupRuleInterceptor();
});


let appProxy = app;
let iconName = 'Artix_DragonSquare_256.png';
let pluginName;
let appIcon;
let contextMenu;
let mainWindow;
let mainWinTimer;
let iq_win;
let iqIsPlaying = false;
let UpdateURL = 'https://launch.artix.com/latest/';
let UpdateFilename = 'ArtixLauncher_win_x64.exe';
let UpdateFilePath = 'ArtixLauncher_win_x64.exe';
let DownloadFolder = 'downloads';
let MinimizeToTray = true;
let NotificationsEnabled = true;
let ClearDataOnExit = false;
let enableRuffle = false;
let UseRuffle = true;
let IsUpdating = false;
let gameIDS = {
	'launch-aqw': 1135,
	'launch-ed': 1141,
	'launch-df': 1138,
	'launch-aq': 1137,
	'launch-mq': 1139,
	'launch-os': 1140,
	'launch-aq3d': 1136
};

let isMac = false; // SET THIS BACK WHEN MINIMIZE FEATURE RELEASED (process.platform == 'darwin');
let tempTimers = [];
let RuffleName = "ruffle.exe";
let ruffleWindows = 
{
	aq: null,
	aqw:null,
	df: null,
	mq: null,
	ed: null,
	os: null
};

process.setMaxListeners(100);

var gameWindows =
{
    aqw: { url:"https://game.aq.com/game/gamefiles/Loader3.swf?ver=a", size:"top=100,left=15,width=960,height=580" },
	aqwcreate: { url:"https://www.aq.com/landing/", size:"top=160,left=30,width=960,height=580" },
	aqwtest: { url:"https://game.aq.com/game/gamefiles/Loader_Spider.swf?ver=2003", size:"top=100,left=15,width=960,height=580" },
    ed: { url:"https://epicduelstage.artix.com/omegaLoader14.swf", size:"top=190,left=45,width=1016,height=700" },
    mq: { url:"https://play.mechquest.com/game/gamefiles/MQLoader6.swf", size:"top=120,left=60,width=1016,height=700" },
    df: { url:"https://play.dragonfable.com/game/DFLoader.swf?ver=2", size:"top=150,left=75,width=1016,height=700" },
    os: { url:"https://oversoul.artix.com/game/OSGame0_9_4g.swf", size:"top=180,left=90,width=960,height=580" },
    aq: { url:"https://aq.battleon.com/game/flash/LoaderAQ.swf", size:"top=210,left=105,width=800,height=600" },
    aq3d: { url:"https://store.steampowered.com/app/429790/AdventureQuest_3D/", size:"top=240,left=120,width=1016,height=700" },
	iq: { url:"https://idlequest.artix.com/game/v/7/", size:"top=180,left=85,width=800,height=600" },
    ebil: { url:"http://www.ebilgames.com", size:"top=270,left=135,width=1024,height=700" }
};


// prints given message both in the terminal console and in the DevTools
function devToolsLog(s) {
	console.log(s);
	 if (mainWindow != null && mainWindow.webContents != null) {
	  mainWindow.webContents.executeJavaScript(`console.log("${s}")`)
	}
}

function createLauncherURL() {
	var launcherURL = 'https://www.artix.com/gamelauncher';
	return launcherURL;
}

app.commandLine.appendSwitch('ignore-gpu-blacklist');

app.IsNotificationEnabled = () => {
	return NotificationsEnabled;
};
app.setAppUserModelId('Artix Entertainment, LLC'); //process.execPath);

// Specify flash path, supposing it is placed in the same directory with main.js.
switch (process.platform) {
	case 'win32':
		pluginName = process.arch == 'x64' ? 'pepflashplayer.dll' : 'pepflashplayer32.dll';
		var platformFilename = process.arch == 'x64' ? 'ArtixLauncher_win_x64.exe' : 'ArtixLauncher_win_x86.exe';
		//DownloadFolder = app.getPath('.') + '\\Artix Entertainment LLC';
		UpdateFilename = platformFilename;
		UpdateFilePath = DownloadFolder + '\\' + platformFilename;
		devToolsLog('Update Path = ' + UpdateFilePath);
		//	iconName = 'icon.ico';
		RuffleName = "ruffle.exe";
		break;
	case 'darwin':
		pluginName = 'PepperFlashPlayer.plugin';
		//DownloadFolder = app.getPath('.') + '/Artix Entertainment LLC';
		UpdateFilename = 'Artix Game Launcher.dmg';
		UpdateFilePath = DownloadFolder + '/Artix Game Launcher.dmg';
		RuffleName = "";
		enableRuffle = false;
		break;
	case 'linux':
		pluginName = 'libpepflashplayer.so';
		//DownloadFolder = app.getPath('.') + '/Artix Entertainment LLC';
		UpdateFilename = 'Artix_Games_Launcher-x86_64.AppImage'
		UpdateFilePath = DownloadFolder + '/Artix_Games_Launcher-x86_64.AppImage';
		RuffleName = "ruffle";
		break;
	default:
		pluginName = 'pepflashplayer.dll';
		//DownloadFolder = app.getPath('.') + '\\Artix Entertainment LLC';
		UpdateFilename = 'ArtixLauncher_win_x64.exe';
		UpdateFilePath = DownloadFolder + '\\ArtixLauncher_win_x64.exe';
		//	iconName = 'icon.ico';
		RuffleName = "ruffle.exe";
		break;
}

app.commandLine.appendSwitch('ppapi-flash-path', path.join(__dirname + '/../plugins/', pluginName));
app.commandLine.appendSwitch('ppapi-flash-version', '32.0.0.371');

//========Interop Functions =========//
app.launch3D = () => {
	var progressBar = new ProgressBar({
		title: 'Launching AQ3D (Requires Steam)',
		text: 'Launching AQ3D',
		detail: 'Attempting to Launch AQ3D (Requires Steam)'
	});
	var steamOpen = shell.openExternal('steam://rungameid/429790');
	steamOpen.then(function (value) {
		setTimeout(function () {
			progressBar.setCompleted();
		}, 10000);
	});

	steamOpen.catch(function (value) {
		setTimeout(function () {
			progressBar.setCompleted();
		}, 10000);
		shell.openExternal('https://store.steampowered.com/app/429790/AdventureQuest_3D/');
	});
};

app.SaveLocalData = (key, obj) => {
	jsonLocalStorage.set(key, obj, function (error, data) {
		if (error) {
			throw error;
		} else {
			devToolsLog('Success: saved ' + key);
		}
	});
};

app.LoadLocalData = (key, callback) => {
	devToolsLog('GetLocalData: ' + key);
	jsonLocalStorage.get(key, function (error, data) {
		if (error) {
			throw error;
		} else {
			devToolsLog('Data:' + data);
			if (callback) {
				callback(data);
			}
		}
	});
};

app.ShowNotification = (message) => {
	if (!NotificationsEnabled) {
		return;
	}
	var notif = new Notification({
		title: 'Artix Game Launcher v.' + clientVersion,
		body: message,
		icon: path.join(__dirname, '/../icons/', iconName)
	});
	notif.show();
};
app.launchIQ = (url) => {
	if (iq_win != null) {
		iq_win.show();
	} else {
		app.iqIsPlaying = true;
		iq_win = new BrowserWindow({
			title: 'IdleQuest',
			width: 800,
			height: 600,
			backgroundColor: '#000000',
			show: true,
			resizable: false,
			useContentSize: true,
			webPreferences: {
				nodeIntegration: false,
				contextIsolation: false,
				preload: path.join(__dirname, '/../preload.js'),
				devTools: true,
				plugins: true
			}
		});

		iq_win.on('close', function (event) {
			app.iqIsPlaying = false;
			iq_win = null;
		});

		//iq_win.on('minimize', function(event) {
		//	if (app.iqIsPlaying) {
		//		event.preventDefault();
		//		iq_win.hide();
		//	}
		//});

		iq_win.loadURL(url); //'https://idlequest.artix.com/game/v/7/');
	}
};

app.clientVersion = () => {
	return clientVersion;
};

app.launchUpdateLink = () => {
	devToolsLog('Attempting Update' + IsUpdating);
	shell.openExternal(UpdateURL+UpdateFilename);
};

app.launchUpdateProcess = () => {
	devToolsLog(process.platform);
	if (process.platform == 'win32') {
		var LaunchprogressBar = new ProgressBar({
			title: 'Launching Update',
			text: 'Launching Update',
			detail: 'Launching Update (Please be patient. This could take a while.)'
		});
		//progressBar.setCompleted();
		var updateOpen = shell
			.openExternal(UpdateFilePath)
			.then(function (value) {
				LaunchprogressBar.setCompleted();
				app.isQuiting = true;
				app.iqIsPlaying = false;
				app.exit();
			})
			.catch(function (value) {
				devToolsLog('Setting IsUpdating');
				IsUpdating = false;
				devToolsLog('Error Launching update.');
				LaunchprogressBar.setCompleted();
				let err_options = {
					buttons: ['Okay'],
					message: 'Error Launching update.  Opening folder location'
				};
				dialog.showMessageBox(err_options).then((value) => {
					shell.showItemInFolder(UpdateFilePath);
				});
			});
	} else {
		shell.showItemInFolder(UpdateFilePath);
		app.isQuiting = true;
		app.iqIsPlaying = false;
		app.exit();
	}
};

app.launchGame = (name) => {
	devToolsLog('Got to Launch?...' + name);
	if(gameWindows[name] == undefined){
		devToolsLog('Bad Game name...' + name);
		return;
	}
	if(enableRuffle && UseRuffle && !(['aq3d','iq','ebil'].includes(name))) {
		app.launchRuffle(name)
		return;
	}
	app.launchGameLocal(name)
};

app.launchGameLocal = (gameName) => {
	if(gameWindows[gameName] == undefined){
		devToolsLog('Bad Game name...' + gameName);
		return;
	}
	var size = gameWindows[gameName].size.split(',');
	var size_x = size[2].split('=')[1];
	var size_y = size[3].split('=')[1];
	var gameUrl = gameWindows[gameName].url;
	app.launchNewWindowURL(gameUrl, Number(size_x), Number(size_y), true);
};

app.launchRuffle = (gameName) => {
	if(gameWindows[gameName] == undefined){
		devToolsLog('Bad Game name...' + gameName);
		return;
	}
	devToolsLog("Launch : "+gameName);
	if(gameWindows[gameName] == undefined) return;
	var size = gameWindows[gameName].size.split(',');
	var size_x = size[2].split('=')[1];
	var size_y = size[3].split('=')[1];
	
	const rufflePath = path.join(__dirname, '/../ruffle/', RuffleName);
	var swfURL = gameWindows[gameName].url;
	// Construct the command arguments
	const args = [
		swfURL,
		'--tcp-connections', 'allow', '--player-version', '9', '--width', size_x, '--height', size_y // Combine the flag and value
	];

	try {
		console.log(args)
		if (ruffleWindows[gameName] == null) {
            ruffleWindows[gameName] = 1; //1 = spawning.
			var ruffleProcess = spawn(rufflePath, args, {
				detached: true // Important: Detach the process so it doesn't terminate with the Electron app
			});

			ruffleProcess.stdout.on('data', (data) => {
				// Listen for any data so that I know the ruffle process has started - 
				// Optionally I can log the data to see ruffle's output. 
				//var message = data.toString();
				//devToolsLog(message);
				if(ruffleWindows[gameName] != null) {
					devToolsLog('spawned ruffle '+gameName);
					ruffleWindows[gameName] = null; //now I can spawn another instance
				}
			});
			ruffleProcess.on('error', (error) => {
				devToolsLog('Failed to start Ruffle:', error);
				ruffleWindows[gameName] = null; //now I can spawn another instance
			});


			ruffleProcess.on('exit', (code) => {
				devToolsLog(`Ruffle exited with code ${code}`);
				ruffleWindows[gameName] = null;
			});
		}
		
	} catch (error) {
		console.error('Error spawning Ruffle:', error);
		// Handle the error appropriately.
	}
};
  

app.launchNewWindowURL = (url, w, h, r = true, dev = true) => {
	var new_win = new BrowserWindow({
		width: w,
		height: h,
		backgroundColor: '#000000',
		show: true,
		resizable: r,
		useContentSize: true,
		autoHideMenuBar: !dev,
		//alwaysOnTop: true,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: false,
			preload: path.join(__dirname, '/../preload.js'),
			devTools: dev,
			plugins: true
		}
	});
	new_win.loadURL(url).then(() => {
		new_win.setAlwaysOnTop(false);
	}).catch(function() {
		new_win.close();
		
	}); //'https://idlequest.artix.com/game/v/7/');

	// if (url.indexOf('405.battleon.com') > -1) {
	// 	devToolsLog("URL is Admin");

	// 	new_win.on('page-title-updated', function (event) {
	// 		event.preventDefault();
	// 		tempTimers.push(setTimeout(function () {
	// 			devToolsLog('Admin window on top disabled');
	// 			new_win.setAlwaysOnTop(false);
	// 		}, 5000));
	// 		new_win.setTitle(new_win.webContents.getURL());

	// 	});
	// }
}

app.setGameWindows = (obj) => {
	try {
		gameWindows = obj;
	}
	catch (e) {
		devToolsLog("obj error");
	}
}

app.clearCache = () => {
	session.defaultSession
		.clearCache()
		.then(() => {
			devToolsLog('ClearCache');
			if (!app.isQuiting)
				dialog.showMessageBox(mainWindow, { title: 'Cache Cleared', message: 'Cache Cleared Successfully' });
			app.SaveLocalData('config', {
				NotificationsEnabled: NotificationsEnabled,
				MinimizeToTray: MinimizeToTray,
				ClearDataOnExit: ClearDataOnExit,
				UseRuffle: UseRuffle
			});
		})
		.catch((reason) => {
			devToolsLog(reason);
		});
};

app.clearCookies = () => {
	devToolsLog('ClearCookies');
	session.defaultSession
		.clearStorageData({ storages: ['cookies', 'appcache'] })
		.then(() => {
			if (!app.isQuiting)
				dialog.showMessageBox(mainWindow, {
					title: 'Cookies Cleared',
					message: 'Cookies Cleared Successfully'
				});
			else app.quit();
		})
		.catch((reason) => {
			devToolsLog(reason);
		});
};

app.openExternalURL = (url) => {
	shell.openExternal(url);
}


if (!gotTheLock) {
	app.isQuiting = true;
	app.exit();
} else {
	app.on('second-instance', (event, commandLine, workingDirectory) => {
			if (mainWindow != null) {
				mainWindow.show();
			}		
	});
}
let newAgentString = "";

app.CreateMainWindow = () =>
{
	let win = new BrowserWindow({
		title: 'Loading Artix Games',
		width: 1366,
		height: 768,
		backgroundColor: '#000000',
		show: false,
		webPreferences: {
			preload: path.join(__dirname, '/../preload.js'),
			nodeIntegration: false,
			contextIsolation: false,
			devTools: true,
			plugins: true
		}
	});

	mainWindow = win;

	// mainWindow.on('ready-to-show', () => {
	// 	mainWindow.webContents.openDevTools()

	// });

	mainWindow.once('did-finish-load', function (event) {
		mainWindow.show();
	});

	mainWindow.once('page-title-updated', function (event) {
		clearTimeout(mainWinTimer);
		//mainWinProgressBar.setCompleted();
		mainWindow.show();
		mainWindow.title = 'Artix Game Launcher v.' + clientVersion;
		app.isQuiting = false;
		// switch (process.platform) {
		// 	case 'darwin':
		// 		appIcon = new Tray(path.join(__dirname, '/../icons/', 'Artix_DragonSquare_18x18.png'));
		// 		break;
		// 	default:
		// 		break;
		// }
		if (process.platform != 'darwin') {
			appIcon = new Tray(path.join(__dirname, '/../icons/', 'Artix_DragonSquare_32x32.png'));
			appIcon.setToolTip('Artix Game Launcher v.' + clientVersion);
			appIcon.setContextMenu(contextMenu);
			appIcon.on('double-click', function () {
				mainWindow.show();
				mainWindow.reload();
			});
			appIcon.on('click', function () {
				appIcon.popUpContextMenu();
			});
		} else {
			app.dock.setMenu(contextMenu);
			app.dock.setIcon(path.join(__dirname, '/../icons/', iconName));
		}
	});

	mainWindow.on('close', function (event) {
		if (!app.isQuiting && MinimizeToTray) {
			event.preventDefault();
			app.ShowNotification('Minimized to system tray. Right Click icon to exit.');
			mainWindow.hide();
		} else if (!MinimizeToTray) {
			app.clearCache();
			if (ClearDataOnExit) {
				app.clearCookies();
			}
			app.isQuiting = true;
			app.quit();
		}
		return false;
	});
}

//====================================//
app.once('ready', () => {
	isQuiting = true;
	
	app.CreateMainWindow();

	// remove Artix custom userAgent partial string
	newAgentString = mainWindow.webContents.userAgent.replace(/Artix.*\s/,"");
	session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
		details.requestHeaders['User-Agent'] = newAgentString;
		details.requestHeaders['artixmode'] = 'launcher';
		callback({ cancel: false, requestHeaders: details.requestHeaders });
    });

	let checkval = NotificationsEnabled;
	let checkvalMin = MinimizeToTray;
	let checkvalClear = ClearDataOnExit;
	let checkRuffle = UseRuffle;
	let MinimizeVisible = !isMac; //(process.platform == 'darwin');
	devToolsLog('Checked> ' + checkval);
	let menuTemplate = [
		{
			label: 'Show Launcher',
			id: 'Show Launcher',
			click: function () {
				mainWindow.show();
				mainWindow.reload();
			}
		},
		{
			label: 'Clear Cache',
			id: 'Clear Cache',
			click: function () {
				app.clearCache();
			}
		},
		{
			label: 'Clear All Data On Exit',
			id: 'Clear Data',
			type: 'checkbox',
			checked: checkvalClear,

			click: function (menuItem) {
				devToolsLog(menuItem.checked);
				ClearDataOnExit = menuItem.checked;
				app.SaveLocalData('config', {
					NotificationsEnabled: NotificationsEnabled,
					MinimizeToTray: MinimizeToTray,
					ClearDataOnExit: menuItem.checked,
					UseRuffle:UseRuffle
				});
			}
		},
		{
			label: 'Use Ruffle Player',
			id: 'Ruffle',
			type: 'checkbox',
			checked: checkRuffle,
			visible: enableRuffle,
			click: function (menuItem) {
				devToolsLog(menuItem.checked);
				if(enableRuffle)
					UseRuffle = menuItem.checked;
				app.SaveLocalData('config', {
					NotificationsEnabled: NotificationsEnabled,
					MinimizeToTray: MinimizeToTray,
					ClearDataOnExit: ClearDataOnExit,
					UseRuffle:menuItem.checked
				});
			}
		},
		{
			label: 'Minimize to Tray',
			id: 'Minimize',
			type: 'checkbox',
			checked: checkvalMin,
			//visible: MinimizeVisible,
			click: function (menuItem) {
				devToolsLog(menuItem.checked);
				MinimizeToTray = menuItem.checked;
				app.SaveLocalData('config', {
					NotificationsEnabled: NotificationsEnabled,
					MinimizeToTray: menuItem.checked,
					ClearDataOnExit: ClearDataOnExit,
					UseRuffle:UseRuffle
				});
			}
		},

		{
			label: 'Enable Notifications',
			id: 'Enable Notifications',
			type: 'checkbox',
			checked: checkval,

			click: function (menuItem) {
				devToolsLog(menuItem.checked);
				NotificationsEnabled = menuItem.checked;
				app.SaveLocalData('config', {
					NotificationsEnabled: menuItem.checked,
					MinimizeToTray: MinimizeToTray,
					ClearDataOnExit: ClearDataOnExit,
					UseRuffle:UseRuffle
				});
			}
		},

		{ type: 'separator' },
		{
			label: 'AdventureQuest',
			id: 'AdventureQuest',
			click: function () {
				if(enableRuffle && UseRuffle) {
					app.launchRuffle('aq');
				}
				else {
					app.launchGameLocal('aq');
				}
			}
		},
		{
			label: 'AdventureQuest 3D',
			id: 'AdventureQuest 3D',
			click: function () {
				app.launch3D();
			}
		},
		{
			label: 'AdventureQuest Worlds',
			id: 'AdventureQuest Worlds',
			click: function () {
				if(enableRuffle && UseRuffle) {
					app.launchRuffle('aqw');
				}
				else {
					app.launchGameLocal('aqw');
				}
			}
		},
		{
			label: 'Dragonfable',
			id: 'Dragonfable',
			click: function () {
				if(enableRuffle && UseRuffle) {
					app.launchRuffle('df');
				}
				else {
					app.launchGameLocal('df');
				}
			}
		},
		{
			label: 'Ebil Games',
			id: 'Ebil Games',
			click: function () {
				app.launchGameLocal('ebil');
			}
		},
		{
			label: 'Epic Duel',
			id: 'Epic Duel',
			click: function () {
				if(enableRuffle && UseRuffle) {
					app.launchRuffle('ed');
				}
				else {
					app.launchGameLocal('ed');
				}
			}
		},
		{
			label: 'IdleQuest',
			id: 'IdleQuest',
			click: function () {
				app.launchGameLocal('iq');
			}
		},
		{
			label: 'MechQuest',
			id: 'MechQuest',
			click: function () {
				if(enableRuffle && UseRuffle) {
					app.launchRuffle('mq');
				}
				else {
					app.launchGameLocal('mq');
				}
			}
		},
		{
			label: 'Oversoul',
			id: 'Oversoul',
			click: function () {
				if(enableRuffle && UseRuffle) {
					app.launchRuffle('os');
				}
				else {
					app.launchGameLocal('os');
				}
			}
		},

		{ type: 'separator' },

		{
			label: 'Exit',
			id: 'Exit',
			click: function () {
				app.iqIsPlaying = false;
				app.isQuiting = true;
				app.clearCache();
				if (ClearDataOnExit) {
					app.clearCookies();
				} else {
					app.quit();
				}
			}
		}
	];
	
	contextMenu = Menu.buildFromTemplate(menuTemplate);
	app.LoadLocalData('config', function (data) {
		if (!isMac) //process.platform != 'darwin')
			MinimizeToTray = contextMenu.getMenuItemById('Minimize').checked;
		else
			MinimizeToTray = true;
		NotificationsEnabled = contextMenu.getMenuItemById('Enable Notifications').checked;
		ClearDataOnExit = contextMenu.getMenuItemById('Clear Data').checked;
		if(enableRuffle)
			UseRuffle = contextMenu.getMenuItemById('Ruffle').checked;
		if ('NotificationsEnabled' in data) {
			NotificationsEnabled = data.NotificationsEnabled;
		}
		
		if ('ClearDataOnExit' in data) {
			ClearDataOnExit = data.ClearDataOnExit;
		}

		if ('MinimizeToTray' in data) {
			if (!isMac) //process.platform != 'darwin') 
				MinimizeToTray = data.MinimizeToTray;
			else
				MinimizeToTray = true;
		}

		if ('UseRuffle' in data && enableRuffle) {
			UseRuffle = data.UseRuffle;
		}
		else {
			UseRuffle = false;
		}
		
		app.SaveLocalData('config', {
			NotificationsEnabled: NotificationsEnabled,
			MinimizeToTray: MinimizeToTray,
			ClearDataOnExit: ClearDataOnExit,
			UseRuffle:UseRuffle
		});
		if (!isMac) { //process.platform != 'darwin') {
			contextMenu.getMenuItemById('Minimize').checked = MinimizeToTray;
		}
		contextMenu.getMenuItemById('Enable Notifications').checked = NotificationsEnabled;
		contextMenu.getMenuItemById('Clear Data').checked = ClearDataOnExit;
		contextMenu.getMenuItemById('Ruffle').checked = UseRuffle;
	});

	var launcherURL = createLauncherURL();

	mainWindow.loadURL(launcherURL, options).then(function () {
		devToolsLog("Loaded "+launcherURL);
	}).catch((error) => {
		dialog.showMessageBox(
			win,
			{
				title: 'Failed to connect',
				message: 'Something failed to load. Please restart the launcher if you experience issues.'
			},
		);

	});
});

app.on('browser-window-created', function (e, win) {
	win.devTools = true; //false;
	win.backgroundColor = '#000000';
	win.setMenuBarVisibility(false);
	//	win.setIcon(path.join(__dirname, '/../icons/', iconName));
	win.webContents.on('before-input-event', (event, input) => {
	if ((input.control && input.key.toLowerCase() === 'arrowleft') && win.webContents.canGoBack()) {
		console.log('Pressed back');
		win.webContents.goBack()
		event.preventDefault();
	}
	else if ((input.control && input.key.toLowerCase() === 'arrowright') && win.webContents.canGoForward()) {
		console.log('Pressed forward');
		win.webContents.goForward()
		event.preventDefault();
	} else if (input.control && input.key === "i") {
      console.log("Opened devtools");
      win.webContents.openDevTools();
    }
	//win.webContents.openDevTools();
});

win.on('close', function () {
	for (var i = 0; i < tempTimers.length; i++) {
		clearTimeout(tempTimers[i]); // clear all the timeouts
	}
	tempTimers = [];//empty the id array
});

win.webContents.setZoomFactor(1.0);

// Upper Limit is working of 500 %
win.webContents
	.setVisualZoomLevelLimits(1, 5)
	.then(console.log("Zoom Levels Have been Set between 100% and 500%"))
	.catch((err) => console.log(err));

	win.webContents.on("zoom-changed", (event, zoomDirection) => {
		console.log(zoomDirection);
		var currentZoom = win.webContents.getZoomFactor();
		console.log("Current Zoom Factor - ", currentZoom);
		// console.log('Current Zoom Level at - '
		// , win.webContents.getZoomLevel());
		console.log("Current Zoom Level at - ", win.webContents.zoomLevel);
	  
		if (zoomDirection === "in") {
			
			// win.webContents.setZoomFactor(currentZoom + 0.20);
			win.webContents.zoomFactor = currentZoom + 0.2;
	  
			console.log("Zoom Factor Increased to - "
						, win.webContents.zoomFactor * 100, "%");
		}
		if (zoomDirection === "out") {
			
			// win.webContents.setZoomFactor(currentZoom - 0.20);
			win.webContents.zoomFactor = currentZoom - 0.2;
	  
			console.log("Zoom Factor Decreased to - "
						, win.webContents.zoomFactor * 100, "%");
		}
	});

});


app.on('will-quit', function (event) {
	if (!app.isQuiting) {
		event.preventDefault();
	}
	else {
		MinimizeToTray = false;
		app.quit();
	}
	return false;
});

app.on('window-all-closed', function (event) {
	if (!app.isQuiting && MinimizeToTray) {
		event.preventDefault();
	}
	return false;
});


app.on('quit', function (event) {
	devToolsLog('Received Quit');
	if (!app.isQuiting) app.clearCache();
	if (ClearDataOnExit && !app.isQuiting) {
		devToolsLog('Clear Data?');
		app.isQuiting = true;
		app.clearCookies();
		event.preventDefault();
		return true;
	}
	if (!MinimizeToTray) {
		app.isQuiting = true;
		app.iqIsPlaying = false;
	}
	if (process.platform == 'darwin') {
		app.isQuiting = true;
	}
	if (!app.isQuiting) {
		event.preventDefault();
	}
	return false;
});

