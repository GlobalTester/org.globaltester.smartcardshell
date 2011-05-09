package org.globaltester.smartcardshell.ui.preferences;

import java.util.Enumeration;

import opencard.core.terminal.CardTerminal;
import opencard.core.terminal.CardTerminalRegistry;

import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.jface.preference.FieldEditor;
import org.eclipse.swt.SWT;
import org.eclipse.swt.events.DisposeEvent;
import org.eclipse.swt.events.DisposeListener;
import org.eclipse.swt.events.SelectionAdapter;
import org.eclipse.swt.events.SelectionEvent;
import org.eclipse.swt.layout.GridData;
import org.eclipse.swt.layout.GridLayout;
import org.eclipse.swt.widgets.Button;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Control;
import org.eclipse.swt.widgets.Event;
import org.eclipse.swt.widgets.Listener;
import org.eclipse.swt.widgets.Shell;
import org.eclipse.ui.PlatformUI;

public class OcfReaderSelectionFieldEditor extends FieldEditor {

	private String value = "";
	private int numColumns;
	private Composite parent;
	private Composite radioBox;
	private Button[] radioButtons;
	private Button btnRefresh;

	/**
	 * Creates a field editor that displays available readers and allows
	 * selection of exactly one.
	 * 
	 * @param name
	 *            the name of the preference this field editor works on
	 * @param labelText
	 *            the label text of the field editor
	 * @param numColumns
	 *            the number of columns for the radio button presentation
	 * @param parent
	 *            the parent of the field editor's control
	 */
	public OcfReaderSelectionFieldEditor(String name, String labelText,
			int numColumns, Composite parent) {
		init(name, labelText);
		this.numColumns = numColumns;
		this.parent = parent;
		createControl(parent);
	}

	@Override
	protected void adjustForNumColumns(int numColumns) {
		Control control = getLabelControl();
		if (control != null) {
			((GridData) control.getLayoutData()).horizontalSpan = numColumns;
		}
		((GridData) radioBox.getLayoutData()).horizontalSpan = numColumns;
	}

	@Override
	protected void doFillIntoGrid(Composite parent, int numColumns) {
		Control control = getLabelControl(parent);
		GridData gd = new GridData();
		gd.horizontalSpan = numColumns;
		control.setLayoutData(gd);

		control = getRadioBoxControl(parent);
		gd = new GridData();
		gd.horizontalSpan = numColumns;
		gd.heightHint = 200;
		control.setLayoutData(gd);

		control = getRefreshButtonControl(parent);
		gd = new GridData();
		gd.horizontalSpan = numColumns;
		control.setLayoutData(gd);
	}

	/**
	 * Returns this field editor's radio group control.
	 * 
	 * @param parent
	 *            The parent to create the radioBox in
	 * @return the radio group control
	 */
	private Composite getRadioBoxControl(Composite parent) {
		if (radioBox == null) {

			radioBox = new Composite(parent, SWT.NONE);
			GridLayout layout = new GridLayout();
			layout.marginWidth = 0;
			layout.marginHeight = 0;
			layout.horizontalSpacing = HORIZONTAL_GAP;
			layout.numColumns = numColumns;
			radioBox.setLayout(layout);
			radioBox.addDisposeListener(new DisposeListener() {
				public void widgetDisposed(DisposeEvent event) {
					disposeReaderRadioButtons();
					radioBox = null;
				}

			});
			createReaderRadioButtons(radioBox);
		} else {
			checkParent(radioBox, parent);
		}
		return radioBox;
	}

	/**
	 * Create radio buttons for all available readers. If buttons where created
	 * previously those are disposed.
	 * 
	 * @param parent
	 *            The parent to create the radioBox in
	 * @return the radio group control
	 */
	private void createReaderRadioButtons(Composite parent) {
		disposeReaderRadioButtons();
		
		String[] readers = getAvailableReaders();
		radioButtons = new Button[readers.length];
		for (int i = 0; i < readers.length; i++) {
			Button radio = new Button(parent, SWT.RADIO | SWT.LEFT);
			radioButtons[i] = radio;
			radio.setText(readers[i]);
			radio.setData(readers[i]);
			radio.addSelectionListener(new SelectionAdapter() {
				public void widgetSelected(SelectionEvent event) {
					String oldValue = value;
					value = (String) event.widget.getData();
					setPresentsDefaultValue(false);
					fireValueChanged(VALUE, oldValue, value);
				}
			});
		}
	}

	/**
	 * Dispose this field editors radio buttons.
	 */
	private void disposeReaderRadioButtons() {
		if (radioButtons != null) {
			for (int i = 0; i < radioButtons.length; i++) {
				Composite parent = radioButtons[i].getParent();
				radioButtons[i].dispose();
				parent.pack();
			}
		}
		radioButtons = null;
	}

	/**
	 * Returns this field editors refresh button control.
	 * 
	 * @param parent
	 *            The parent to create the button in
	 * @return the refresh button control
	 */
	private Control getRefreshButtonControl(Composite parent) {
		// create the button if needed
		if (btnRefresh == null) {
			btnRefresh = new Button(parent, SWT.PUSH);
			btnRefresh.setText("Refresh reader list");

			btnRefresh.addListener(SWT.Selection, new Listener() {
				public void handleEvent(Event e) {
					switch (e.type) {
					case SWT.Selection:

						//create buttons
						createReaderRadioButtons(radioBox);
						radioBox.pack();
						
						//select the correct button
						doLoad();
						break;
					}
				}
			});
		}

		return btnRefresh;
	}

	@Override
	protected void doLoad() {
		updateValue(getPreferenceStore().getString(getPreferenceName()));
	}

	@Override
	protected void doLoadDefault() {
		updateValue(getPreferenceStore().getDefaultString(getPreferenceName()));
	}

	@Override
	protected void doStore() {
		if (value == null) {
			getPreferenceStore().setToDefault(getPreferenceName());
			return;
		}

		getPreferenceStore().setValue(getPreferenceName(), value);

	}

	@Override
	public int getNumberOfControls() {
		return 1;
	}

	@Override
	public void setEnabled(boolean enabled, Composite parent) {
		super.setEnabled(enabled, parent);
		for (int i = 0; i < radioButtons.length; i++) {
			radioButtons[i].setEnabled(enabled);
		}

	}

	/**
	 * Scan OCF for currently available readers and return an array containing
	 * their names.
	 * 
	 * @return
	 */
	public String[] getAvailableReaders() {
		String[] readerList = null;
		try {
			CardTerminalRegistry ctr = CardTerminalRegistry.getRegistry();
			Enumeration<?> ctlist = ctr.getCardTerminals();

			int i = ctr.countCardTerminals();
			readerList = new String[i];
			i = 0;
			while (ctlist.hasMoreElements()) {
				CardTerminal ct = (CardTerminal) ctlist.nextElement();
				readerList[i] = ct.getName();
				i++;
			}

		} catch (Exception e) {
			System.out.println(e);
			Shell shell = PlatformUI.getWorkbench().getActiveWorkbenchWindow()
					.getShell();
			MessageDialog.openError(shell, "GlobalTester",
					"No card reader available!");

		}
		return readerList;
	}

	/**
	 * Select the radio button that conforms to the given value.
	 * 
	 * @param selectedValue
	 *            the selected value
	 */
	private void updateValue(String selectedValue) {
		this.value = selectedValue;
		if (radioButtons == null) {
			return;
		}

		if (this.value != null) {
			boolean found = false;
			for (int i = 0; i < radioButtons.length; i++) {
				Button radio = radioButtons[i];
				boolean selection = false;
				if (((String) radio.getData()).equals(this.value)) {
					selection = true;
					found = true;
				}
				radio.setSelection(selection);
			}
			if (found) {
				return;
			}
		}

		// We weren't able to find the value. So we select the first
		// radio button as a default.
		if (radioButtons.length > 0) {
			radioButtons[0].setSelection(true);
			this.value = (String) radioButtons[0].getData();
		}
		return;
    }

	public Composite getParent() {
		return parent;
	}

}
