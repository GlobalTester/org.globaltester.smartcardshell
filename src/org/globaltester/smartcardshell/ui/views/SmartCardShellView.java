package org.globaltester.smartcardshell.ui.views;

import opencard.core.OpenCardException;

import org.eclipse.jface.action.Action;
import org.eclipse.jface.action.IMenuListener;
import org.eclipse.jface.action.IMenuManager;
import org.eclipse.jface.action.IToolBarManager;
import org.eclipse.jface.action.MenuManager;
import org.eclipse.jface.action.Separator;
import org.eclipse.swt.SWT;
import org.eclipse.swt.custom.StyledText;
import org.eclipse.swt.events.KeyEvent;
import org.eclipse.swt.events.KeyListener;
import org.eclipse.swt.graphics.Font;
import org.eclipse.swt.layout.GridData;
import org.eclipse.swt.layout.GridLayout;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Control;
import org.eclipse.swt.widgets.Event;
import org.eclipse.swt.widgets.FileDialog;
import org.eclipse.swt.widgets.Label;
import org.eclipse.swt.widgets.Listener;
import org.eclipse.swt.widgets.Shell;
import org.eclipse.swt.widgets.Text;
import org.eclipse.ui.IActionBars;
import org.eclipse.ui.ISharedImages;
import org.eclipse.ui.IWorkbenchActionConstants;
import org.eclipse.ui.PlatformUI;
import org.eclipse.ui.part.ViewPart;
import org.globaltester.smartcardshell.CommandHistory;
import org.globaltester.smartcardshell.ScriptRunner;
import org.mozilla.javascript.Context;

import de.cardcontact.scdp.js.GPTracer;

public class SmartCardShellView extends ViewPart implements GPTracer {
	
	public static final String RETURN_PROMPT = "#> ";

	public static final String ID = "org.globaltester.smartcardshell.ui.views.SmartCardShellView";
	private StyledText sTxtConsoleOut;
	private Text txtConsoleInput;

	private ScriptRunner scriptRunner;
	private Label lblPrompt;
	private Context cx;
	
	private Action execFileAction;
	protected Shell parentShell;
	protected CommandHistory cmdHistory = new CommandHistory();

	public SmartCardShellView() throws OpenCardException,
			ClassNotFoundException {

		cx = Context.enter();
		scriptRunner = new ScriptRunner(cx, System.getProperty("user.dir"));
		scriptRunner.init(cx);
		scriptRunner.setPromptString("scsh");
		scriptRunner.setTracer(this);
	}

	public void createPartControl(Composite parent) {
		//store the shell of parent composite for future reference
		parentShell = parent.getShell();
		
		//monospaced font to make sure indentation is displayed correctly
		Font mono = new Font(parent.getDisplay(), "Courier", 10, SWT.NONE);

		// use main composite to get rid of outer influence
		Composite mainComp = new Composite(parent, SWT.NONE);
		mainComp.setLayout(new GridLayout(2, false));

		// widget for console output
		sTxtConsoleOut = new StyledText(mainComp, SWT.READ_ONLY | SWT.H_SCROLL
				| SWT.V_SCROLL);
		sTxtConsoleOut.setText(ScriptRunner.getBanner());
		sTxtConsoleOut.setEditable(false);
		sTxtConsoleOut.setLayoutData(new GridData(SWT.FILL, SWT.FILL, true,
				true, 2, 1));
		sTxtConsoleOut.setFont(mono);

		lblPrompt = new Label(mainComp, SWT.NONE);
		lblPrompt.setBackground(sTxtConsoleOut.getBackground());
		lblPrompt.setText(scriptRunner.getPromptString() + ">");
		lblPrompt.setFont(mono);

		// widget for command input
		txtConsoleInput = new Text(mainComp, SWT.NONE);
		txtConsoleInput.setLayoutData(new GridData(SWT.FILL, SWT.CENTER, true,
				false, 1, 1));
		mainComp.setTabList(new Control[] { txtConsoleInput });
		txtConsoleInput.setFont(mono);
		txtConsoleInput.addListener(SWT.DefaultSelection, new Listener() {
			public void handleEvent(Event e) {
				String cmd = txtConsoleInput.getText();
				txtConsoleInput.setText("");

				//put the command in the command history
				cmdHistory.append(cmd);
				
				// execute the command and show output
				executeCommand(cmd);

			}
		});
		
		//keyListener to handle CommandHistory
		txtConsoleInput.addKeyListener(new KeyListener() {
			public void keyReleased(KeyEvent e) {
				
			}
			
			public void keyPressed(KeyEvent e) {
				switch (e.keyCode) {
					case SWT.ARROW_UP:
						txtConsoleInput.setText(cmdHistory.getPreviousCmd());
						break;
					case SWT.ARROW_DOWN:
						txtConsoleInput.setText(cmdHistory.getNextCmd());
						break;
					default:
						if (cmdHistory.isLastCommand()) {
							cmdHistory.setLastCommand(txtConsoleInput.getText());
						}
				}
			}
		});
		
		// make common white background
		mainComp.setBackground(sTxtConsoleOut.getBackground());

		//setup actions, menus etc
		makeActions();
		hookContextMenu();
		contributeToActionBars();
	}

	protected void executeCommand(String cmd) {

		// print promt and command in output widget
		sTxtConsoleOut.append("\n" + scriptRunner.getInteractivePrompt() + "> "
				+ cmd + "\n");
		sTxtConsoleOut.setTopIndex(sTxtConsoleOut.getLineCount());

		// execute the command in ScriptRunner and print output to widget
		String output;
		try {
			output = scriptRunner.executeCommand(cx, cmd);
		} catch (Exception e) {
			output = e.getMessage();
		}
		sTxtConsoleOut.append(RETURN_PROMPT+output);
		sTxtConsoleOut.setTopIndex(sTxtConsoleOut.getLineCount());

	}
	
	private void fillLocalPullDown(IMenuManager manager) {
		manager.add(execFileAction);
//		manager.add(new Separator());
//		manager.add(dummyAction);
	}

	private void fillContextMenu(IMenuManager manager) {
		manager.add(execFileAction);
		// Other plug-ins can contribute their actions here
		manager.add(new Separator(IWorkbenchActionConstants.MB_ADDITIONS));
	}

	private void fillLocalToolBar(IToolBarManager manager) {
		manager.add(execFileAction);
//		manager.add(dummyAction);
	}

	private void makeActions() {
		execFileAction = new Action() {
			public void run() {
				FileDialog fileDialog = new FileDialog(parentShell);
//				fileDialog.setFilterPath("/etc");
				fileDialog.setFilterExtensions(new String[] { "*.js", "*" });
				fileDialog.setFilterNames(new String[] { "JavaScript files (*.js)", "All files (*)" });
				fileDialog.setText("FileDialog");
				String selectedFile = fileDialog.open();
				if (selectedFile != null) {
					String result = "";
					try {
						result = scriptRunner.evaluateFile(cx, selectedFile);
					} catch (RuntimeException e) {
						result = e.getMessage();
						throw e;
					} finally {
						sTxtConsoleOut.append(RETURN_PROMPT+result);
					}
				}
				
			}
		};
		execFileAction.setText("Execute file...");
		execFileAction.setToolTipText("Execute file...");
		execFileAction.setImageDescriptor(PlatformUI.getWorkbench()
				.getSharedImages()
				.getImageDescriptor(ISharedImages.IMG_OBJS_INFO_TSK));

	}
	
	private void hookContextMenu() {
		MenuManager menuMgr = new MenuManager("#PopupMenu");
		menuMgr.setRemoveAllWhenShown(true);
		menuMgr.addMenuListener(new IMenuListener() {
			public void menuAboutToShow(IMenuManager manager) {
				SmartCardShellView.this.fillContextMenu(manager);
			}
		});
	}

	private void contributeToActionBars() {
		IActionBars bars = getViewSite().getActionBars();
		fillLocalPullDown(bars.getMenuManager());
		fillLocalToolBar(bars.getToolBarManager());
	}
	
	@Override
	public void setFocus() {
		txtConsoleInput.setFocus();
	}

	@Override
	public void dispose() {
		super.dispose();

		// exit ECMAScript context
		cx = null;
		Context.exit();
	}

	@Override
	public String copy() {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public boolean isTraceEnabled() {
		return true;
	}

	@Override
	public void mark() {
		// TODO Auto-generated method stub
		
	}

	@Override
	public boolean trace(String className, LogLevel logLevel, Object obj) {
		sTxtConsoleOut.append(obj.toString()+"\n");
		return true;
	}

}
