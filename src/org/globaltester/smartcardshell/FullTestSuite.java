package org.globaltester.smartcardshell;

import org.junit.runner.RunWith;
import org.junit.runners.Suite;
import org.junit.runners.Suite.SuiteClasses;

@RunWith(Suite.class)
@SuiteClasses({ ScshSmokeTest.class, ScshFullTest.class, PreferencesTest.class })
public class FullTestSuite {

}
