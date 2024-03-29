package org.globaltester.smartcardshell.ui.preferences;

import org.eclipse.core.runtime.preferences.InstanceScope;
import org.eclipse.jface.preference.BooleanFieldEditor;
import org.eclipse.jface.preference.ComboFieldEditor;
import org.eclipse.jface.preference.FieldEditorPreferencePage;
import org.eclipse.jface.preference.FileFieldEditor;
import org.eclipse.jface.preference.IPreferenceStore;
import org.eclipse.jface.preference.IntegerFieldEditor;
import org.eclipse.jface.preference.PreferencePage;
import org.eclipse.jface.preference.RadioGroupFieldEditor;
import org.eclipse.jface.preference.StringFieldEditor;
import org.eclipse.jface.util.PropertyChangeEvent;
import org.eclipse.swt.SWT;
import org.eclipse.swt.layout.GridData;
import org.eclipse.swt.layout.GridLayout;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Group;
import org.eclipse.ui.IWorkbench;
import org.eclipse.ui.IWorkbenchPreferencePage;
import org.eclipse.ui.preferences.ScopedPreferenceStore;
import org.globaltester.base.ui.preferences.PropertyFieldEditor;
import org.globaltester.smartcardshell.Activator;
import org.globaltester.smartcardshell.ocf.PreferencesPropertyLoader;
import org.globaltester.smartcardshell.preferences.PreferenceConstants;

public class SmartCardShellPreferencePage extends FieldEditorPreferencePage
		implements IWorkbenchPreferencePage {

	private static final int MAX_EXTENDED_LENGTH_APDU_SIZE = 32767;
	private static final String OCF_WARNING = "Changes of OCF Framework parameters will require a restart of SmartCardService to take effect. This might interrupt running SmartCardShells. Further more if you"
			+ " choose use default opencard.properies eclipse MUST be restarted!";
	private boolean ocfConfigSourceChanged = false;
	
	private Group grpSmartcardImplementation;
	private ComboFieldEditor cfeSmartcardImplementation;
	
	private Group grpOcfProperties;
	private RadioGroupFieldEditor rgfeConfigSource;
	private StringFieldEditor sfeScshConfigPath;
	private PropertyFieldEditor pfeOpenCardServices;
	private PropertyFieldEditor pfeOpenCardTerminals;

	private Group grpReaderSelection;
	private BooleanFieldEditor bfeKeepOcfRunning;
	private BooleanFieldEditor bfeForceExclusive;
	private BooleanFieldEditor bfeManualReaderSettings;
	private OcfReaderSelectionFieldEditor orsfeReaderSelection;
	private BooleanFieldEditor bfeEmptyReaderAllowed;
	private boolean configSourceFile;
	private boolean configSourcePreferences;
	private boolean manualReaderSelectEnabled;

	public SmartCardShellPreferencePage() {
		super(FieldEditorPreferencePage.GRID);
		IPreferenceStore store = new ScopedPreferenceStore(InstanceScope.INSTANCE,
				Activator.PLUGIN_ID);
		setPreferenceStore(store);
		setDescription("Preferences for OpenCardFramework and SmartCardShell.");
	}

	@Override
	protected void createFieldEditors() {
		// get common values
		Composite parent = getFieldEditorParent();
		int columns = 3;
		
		// create group for smartcard implementation
		grpSmartcardImplementation = new Group(parent, SWT.NONE);
		grpSmartcardImplementation.setText("Smartcard Implementation");
		GridData gdGrpSmartcardImplementation = new GridData(GridData.FILL, GridData.FILL, true, false);
		
		cfeSmartcardImplementation = new ComboFieldEditor(PreferenceConstants.OCF_SMARTCARD_IMPLEMENTATION,
				"Smartcard implementation", 
				new String[][] {
					new String[] {
						"Java Smartcard I/O",
						"JAVA"
					},
					new String[] {
						"JNA Smartcard I/O",
						"JNA"
					}
				}, 
				grpSmartcardImplementation);
		addField(cfeSmartcardImplementation);
		
		gdGrpSmartcardImplementation.horizontalSpan = columns;
		grpSmartcardImplementation.setLayoutData(gdGrpSmartcardImplementation);
		grpSmartcardImplementation.setLayout(new GridLayout(columns, false));

		// create group for OCF properties
		grpOcfProperties = new Group(parent, SWT.NONE);
		grpOcfProperties.setText("OpenCardFramework");
		GridData gdGrpOcfProperties = new GridData(GridData.FILL,
				GridData.FILL, true, false);

		// create fieldEditors for OCF properties
		String[][] configOptions = {
				{ "Default opencard.properties",
						PreferenceConstants.OCF_CONFIGURATION_SOURCE_default },
				{ "User specified opencard.properties",
						PreferenceConstants.OCF_CONFIGURATION_SOURCE_file },
				{ "Eclipse preferences",
						PreferenceConstants.OCF_CONFIGURATION_SOURCE_preferences } };
		rgfeConfigSource = new RadioGroupFieldEditor(
				PreferenceConstants.OCF_CONFIGURATION_SOURCE,
				"Configuration source\n", 1, configOptions, grpOcfProperties);
		addField(rgfeConfigSource);

		gdGrpOcfProperties.horizontalSpan = 2;
		grpOcfProperties.setLayoutData(gdGrpOcfProperties);
		grpOcfProperties.setLayout(new GridLayout(2, false));

		bfeForceExclusive = new BooleanFieldEditor(
				PreferenceConstants.OCF_FORCE_EXCLUSIVE,
				"Force exclusive reader access where possible", 1, grpOcfProperties);
		addField(bfeForceExclusive);

		bfeKeepOcfRunning = new BooleanFieldEditor(
				PreferenceConstants.OCF_KEEP_RUNNING,
				"Keep OCF running", 1, grpOcfProperties);
		addField(bfeKeepOcfRunning);

		sfeScshConfigPath = new FileFieldEditor(
				PreferenceConstants.OCF_PROPERTIES_FILE, "OpenCard.properties",
				grpOcfProperties);
		addField(sfeScshConfigPath);

		pfeOpenCardServices = new PropertyFieldEditor(
				PreferenceConstants.OCF_OPENCARD_SERVICES, "OpenCard.Services",
				grpOcfProperties);
		addField(pfeOpenCardServices);

		pfeOpenCardTerminals = new PropertyFieldEditor(
				PreferenceConstants.OCF_OPENCARD_TERMINALS,
				"OpenCard.Terminals", grpOcfProperties);
		addField(pfeOpenCardTerminals);
		


		// create group for reader selection
		grpReaderSelection = new Group(getFieldEditorParent(), SWT.NONE);
		grpReaderSelection.setText("Card reader");
		GridData gdGrpReaderSelection = new GridData(GridData.FILL,
				GridData.FILL, true, true);
		gdGrpReaderSelection.horizontalSpan = 3;
		grpReaderSelection.setLayoutData(gdGrpReaderSelection);
		grpReaderSelection.setLayout(new GridLayout(2, false));

		bfeManualReaderSettings = new BooleanFieldEditor(
				PreferenceConstants.OCF_MANUAL_READERSELECT,
				"Manual setting of card terminal", grpReaderSelection);
		addField(bfeManualReaderSettings);

		orsfeReaderSelection = new OcfReaderSelectionFieldEditor(
				PreferenceConstants.OCF_READER, "Reader selection", 1,
				grpReaderSelection);
		addField(orsfeReaderSelection);
		
		bfeEmptyReaderAllowed = new BooleanFieldEditor(
				PreferenceConstants.P_ALLOW_EMPTY_READER,
				"allow empty reader", grpReaderSelection);
		bfeEmptyReaderAllowed.setEnabled(manualReaderSelectEnabled, grpReaderSelection);
		addField(bfeEmptyReaderAllowed);
		
		Group bufferGroup = new Group(getFieldEditorParent(), SWT.NONE);
		bufferGroup.setText("Buffer");
		GridData gd3 = new GridData(GridData.FILL, GridData.FILL, true, false);
		gd3.horizontalSpan = 2;
		bufferGroup.setLayoutData(gd3);
		bufferGroup.setLayout(new GridLayout(2, false));

		IntegerFieldEditor ifeReaderBuffer = new IntegerFieldEditor(
				PreferenceConstants.P_READBUFFER, "Read buffer size:",
				bufferGroup);
		ifeReaderBuffer.setValidRange(0, MAX_EXTENDED_LENGTH_APDU_SIZE); // Maximum size allowed in extended Length APDU
		addField(ifeReaderBuffer);

		RadioGroupFieldEditor rfeReadFileEOF = new RadioGroupFieldEditor(
				PreferenceConstants.P_BUFFERREADFILEEOF,
				"Alternative ways for JavaScript function readFileEOF()",
				1,
				new String[][] {
						new String[] {
								"Read data groups by checking header information (fast)",
								"INFINITE" },
						new String[] {
								"Read data groups byte by byte (very slow)",
								"SMALL" } }, bufferGroup, true);
		addField(rfeReadFileEOF);
		
		updateFieldEditorEnabledStates();

		orsfeReaderSelection.updateReaderList();
		
		if (manualReaderSelectEnabled) {
			orsfeReaderSelection.setEnabled(true, grpReaderSelection);
			bfeEmptyReaderAllowed.setEnabled(true, grpReaderSelection);
		} else {
			orsfeReaderSelection.setEnabled(false, grpReaderSelection);
			bfeEmptyReaderAllowed.setEnabled(false, grpReaderSelection);
		}

	}	

	public void init(IWorkbench workbench) {
		IPreferenceStore pStore = Activator.getDefault().getPreferenceStore();
		
		String ocfConfigSource = pStore
		.getString(PreferenceConstants.OCF_CONFIGURATION_SOURCE);
		configSourceFile = PreferenceConstants.OCF_CONFIGURATION_SOURCE_file.equals(ocfConfigSource);
		configSourcePreferences = PreferenceConstants.OCF_CONFIGURATION_SOURCE_preferences.equals(ocfConfigSource);
		
		manualReaderSelectEnabled = pStore.getBoolean(PreferenceConstants.OCF_MANUAL_READERSELECT);
	}

	@Override
	public void propertyChange(PropertyChangeEvent event) {

		//track selected options for Configsource and manual reader selection
		if (rgfeConfigSource.equals(event.getSource())){
			String newValue = (String) event.getNewValue();
			configSourceFile = PreferenceConstants.OCF_CONFIGURATION_SOURCE_file.equals(newValue);
			configSourcePreferences = PreferenceConstants.OCF_CONFIGURATION_SOURCE_preferences.equals(newValue);
		}
		if (bfeManualReaderSettings.equals(event.getSource())){
			manualReaderSelectEnabled = (Boolean) event.getNewValue();
			if (manualReaderSelectEnabled) {
				orsfeReaderSelection.setEnabled(true, grpReaderSelection);
				bfeEmptyReaderAllowed.setEnabled(true, grpReaderSelection);
			} else {
				orsfeReaderSelection.setEnabled(false, grpReaderSelection);
				bfeEmptyReaderAllowed.setEnabled(false, grpReaderSelection);
			}
		}
		
		// add warning to this dialog if one of the OCF properties changes
		if ((rgfeConfigSource.equals(event.getSource()))
				|| (sfeScshConfigPath.equals(event.getSource()))
				|| (pfeOpenCardServices.equals(event.getSource()))
				|| (pfeOpenCardTerminals.equals(event.getSource()))) {
			this.setOcfWarning(true);
		}
		
		if (orsfeReaderSelection.equals(event.getSource())) {
			getFieldEditorParent().pack(true);
		}
		
		updateFieldEditorEnabledStates();
		
		super.propertyChange(event);
	}

	private void updateFieldEditorEnabledStates() {
		//enable/disable required FieldEditors
		sfeScshConfigPath.setEnabled(configSourceFile, grpOcfProperties);
		pfeOpenCardServices.setEnabled(configSourcePreferences, grpOcfProperties);
		pfeOpenCardTerminals.setEnabled(configSourcePreferences, grpOcfProperties);
		orsfeReaderSelection.setEnabled(manualReaderSelectEnabled, grpReaderSelection);
	}

	private void setOcfWarning(boolean ocfMessage) {
		if (ocfMessage) {
			this.setMessage(OCF_WARNING, PreferencePage.WARNING);
			ocfConfigSourceChanged = true;
		} else {
			this.setMessage("");
			ocfConfigSourceChanged = false;
		}
		orsfeReaderSelection.setRefreshEnabled(!ocfMessage);		
	}

	@Override
	protected void performDefaults() {
		super.performDefaults();
		this.setOcfWarning(true);
		
		IPreferenceStore pStore = Activator.getDefault().getPreferenceStore();
		String ocfConfigSource = pStore.getDefaultString(PreferenceConstants.OCF_CONFIGURATION_SOURCE);
		configSourceFile = PreferenceConstants.OCF_CONFIGURATION_SOURCE_file.equals(ocfConfigSource);
		configSourcePreferences = PreferenceConstants.OCF_CONFIGURATION_SOURCE_preferences.equals(ocfConfigSource);
		
		manualReaderSelectEnabled = pStore.getDefaultBoolean(PreferenceConstants.OCF_MANUAL_READERSELECT);
		bfeEmptyReaderAllowed.setEnabled(manualReaderSelectEnabled, grpReaderSelection);
		
		updateFieldEditorEnabledStates();
	}

	@Override
	protected void performApply() {
		super.performApply();
		
		IPreferenceStore pStore = Activator.getDefault().getPreferenceStore();
		String ocfConfigSource = pStore.getString(PreferenceConstants.OCF_CONFIGURATION_SOURCE);
		configSourceFile = PreferenceConstants.OCF_CONFIGURATION_SOURCE_file.equals(ocfConfigSource);
		configSourcePreferences = PreferenceConstants.OCF_CONFIGURATION_SOURCE_preferences.equals(ocfConfigSource);
		
		manualReaderSelectEnabled = pStore.getBoolean(PreferenceConstants.OCF_MANUAL_READERSELECT);
		
		updateFieldEditorEnabledStates();
	}
	
	@Override
	public boolean performOk() {
		boolean success = super.performOk();
		
		if (ocfConfigSourceChanged) {
			PreferencesPropertyLoader.restartAndInitializeOCF();
			this.setOcfWarning(false);
		}
		
		return success;
	}

}
