Releasetests GlobalTester Smardcardshell
=====================================
This document describes validation tests that shall be performed on the final product artifacts immediately before publishing. These tests focus on overall product quality and completeness (e.g. inclusion/integration of required features). For a complete test coverage please also refer to tests defined in the according bundles.

Use a setup where the final Prove EPP product is installed in a fresh Eclipse IDE.

1. [ ] __Smardcardshell preference tests__  
 - [ ] run the test `7816_A_02` against a non-plain passport
     - [ ] test case must fail with a java.lang.IllegalArgumentException
 - [ ] open the smartcardshell preference page, change the OpenCard.Terminals value to `com.ibm.opencard.terminal.pcsc10.Pcsc10CardTerminalFactory` and press ok 
 - [ ] run the test `7816_A_02` again  
     - [ ] test case must not fail with errors regarding APDU formatting, other behavior depends on sample

<p style="page-break-after: always"/>
