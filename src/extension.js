const path = require('path');
const fs = require('fs');
const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	this.extensionName = 'RobbOwen.synthwave-vscode';
	this.cntx = context;
	
	const config = vscode.workspace.getConfiguration("synthwave84");

	let disableGlow = config && config.disableGlow ? !!config.disableGlow : false;
	
	let brightness = parseFloat(config.brightness) > 1 ? 1 : parseFloat(config.brightness);
	brightness = brightness < 0 ? 0 : brightness;
	brightness = isNaN(brightness) ? 0.45 : brightness;

	const parsedBrightness = Math.floor(brightness * 255).toString(16).toUpperCase();
	let neonBrightness = parsedBrightness;

	let disposable = vscode.commands.registerCommand('synthwave84.enableNeon', function () {

		const base = findAppBaseDir();
		const electronBase = isVSCodeBelowVersion("1.70.0") ? "electron-browser" : "electron-sandbox";
		const workBenchFilename = vscode.version == "1.94.0" ? "workbench.esm.html" : "workbench.html";

		const htmlFile = path.join(base, electronBase, "workbench", workBenchFilename);
		const templateFile = path.join(base, electronBase, "workbench", "neondreams.js");

		try {

			// const version = context.globalState.get(`${context.extensionName}.version`);

			// generate production theme JS
			const chromeStyles = fs.readFileSync(__dirname +'/css/editor_chrome.css', 'utf-8');
			const jsTemplate = fs.readFileSync(__dirname +'/js/theme_template.js', 'utf-8');
			const themeWithGlow = jsTemplate.replace(/\[DISABLE_GLOW\]/g, disableGlow);
			const themeWithChrome = themeWithGlow.replace(/\[CHROME_STYLES\]/g, chromeStyles);
			const finalTheme = themeWithChrome.replace(/\[NEON_BRIGHTNESS\]/g, neonBrightness);
			fs.writeFileSync(templateFile, finalTheme, "utf-8");
			
			// modify workbench html
			const html = fs.readFileSync(htmlFile, "utf-8");

			// check if the tag is already there
			const isEnabled = html.includes("neondreams.js");

			if (!isEnabled) {
				// delete synthwave script tag if there
				let output = html.replace(/^.*(<!-- SYNTHWAVE 84 --><script src="neondreams.js"><\/script><!-- NEON DREAMS -->).*\n?/mg, '');
				// add script tag
				output = html.replace(/\<\/html\>/g, `	<!-- SYNTHWAVE 84 --><script src="neondreams.js"></script><!-- NEON DREAMS -->\n`);
				output += '</html>';
	
				fs.writeFileSync(htmlFile, output, "utf-8");
				
				vscode.window
					.showInformationMessage("Neon Dreams enabled. VS code must reload for this change to take effect. Code may display a warning that it is corrupted, this is normal. You can dismiss this message by choosing 'Don't show this again' on the notification.", { title: "Restart editor to complete" })
					.then(function(msg) {
						vscode.commands.executeCommand("workbench.action.reloadWindow");
					});

			} else {
				vscode.window
					.showInformationMessage('Neon dreams is already enabled. Reload to refresh JS settings.', { title: "Restart editor to refresh settings" })
					.then(function(msg) {
						vscode.commands.executeCommand("workbench.action.reloadWindow");
					});
			}
		} catch (e) {
			if (/ENOENT|EACCES|EPERM/.test(e.code)) {
				vscode.window.showInformationMessage("Neon Dreams was unable to modify the core VS code files needed to launch the extension. You may need to run VS code with admin privileges in order to enable Neon Dreams.");
				return;
			} else {
				vscode.window.showErrorMessage('Something went wrong when starting neon dreams');
				return;
			}
		}
	});

	let disable = vscode.commands.registerCommand('synthwave84.disableNeon', uninstall);
	
	context.subscriptions.push(disposable);
	context.subscriptions.push(disable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
	// ...
}

function uninstall() {
	const appDir = path.dirname(vscode.env.appRoot);
	const base = path.join(appDir, 'app', 'out', 'vs', 'code');
	const electronBase = isVSCodeBelowVersion("1.70.0") ? "electron-browser" : "electron-sandbox";
	const workBenchFilename = vscode.version == "1.94.0" ? "workbench.esm.html" : "workbench.html";

	const htmlFile = path.join(base, electronBase, "workbench", workBenchFilename);

	// modify workbench html
	const html = fs.readFileSync(htmlFile, "utf-8");

	// check if the tag is already there
	const isEnabled = html.includes("neondreams.js");

	if (isEnabled) {
		// delete synthwave script tag if there
		let output = html.replace(/^.*(<!-- SYNTHWAVE 84 --><script src="neondreams.js"><\/script><!-- NEON DREAMS -->).*\n?/mg, '');
		fs.writeFileSync(htmlFile, output, "utf-8");

		vscode.window
			.showInformationMessage("Neon Dreams disabled. VS code must reload for this change to take effect", { title: "Restart editor to complete" })
			.then(function(msg) {
				vscode.commands.executeCommand("workbench.action.reloadWindow");
			});
	} else {
		vscode.window.showInformationMessage('Neon dreams isn\'t running.');
	}
}

// Returns the vscode appRoot directly if it contains `code.mjs` and is called `code`, otherwise returns
// the parent directory.
function findAppBaseDir() {
	const appRoot = vscode.env.appRoot;
	try {
		let appRootName = path.basename(appRoot);
		let appRootFiles = fs.readdirSync(appRoot);

		if (appRootName === "code" && appRootFiles.includes("code.mjs")) {
			if (appRootFiles.includes("app")  && fs.existsSync(path.join(appRoot, 'app', 'out', 'vs', 'code'))) {
				return path.join(appRoot,'app','out','vs','code');
			} else if (appRootFiles.includes("out") && fs.existsSync(path.join(appRoot, 'out', 'vs', 'code'))) {
				return path.join(appRoot, 'out','vs','code');
			}
		}
	} catch(e) {}
	const appDir = path.dirname(vscode.env.appRoot);
	return path.join(appDir,'app','out','vs','code');
}

// Returns true if the VS Code version running this extension is below the
// version specified in the "version" parameter. Otherwise returns false.
function isVSCodeBelowVersion(version) {
	const vscodeVersion = vscode.version;
	const vscodeVersionArray = vscodeVersion.split('.');
	const versionArray = version.split('.');
	
	for (let i = 0; i < versionArray.length; i++) {
		if (vscodeVersionArray[i] < versionArray[i]) {
			return true;
		}
	}

	return false;
}

module.exports = {
	activate,
	deactivate
}
