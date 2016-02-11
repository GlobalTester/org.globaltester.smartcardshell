The folder JavaScriptDebugging is used for Rhino JavaScript debugging tests which 
cannot easily be done automatically.
The simple test case JSDebugger-LoadTest.xml can be executed in GT3. 
It loads a JavaSript file JSDebugger-PrintTest.js where breakpoints can be set.
Besides this it executes a "new ..." operation for loading a smartcardshell 
protocol extension. This is used to verify that the appropriate protocol class 
loaders were properly activated in smartcardshell.

To test the JavaScript debugger do the following:
- Install GT3 on a Luna Eclipse.
- Start GT3.
- Import the files JSDebugger-LoadTest.xml and JSDebugger-PrintTest.js into your test
  case directory e.g. GlobalTester Sample TestSpecification/TestCases
- Adapt the path for the JavaScript load command in the XML file if necessary. 
- Follow the instructions given in the user manual under 
  "Execute Tests -> Debug Test Cases". Set breakpoints in JSDebugger-PrintTest.js and 
  activate "Debug Test" for JSDebugger-LoadTest.xml.

If the debugger works correctly it will open the debug perspective and display the 
code for the hit breakpoint in the JavaSript editor.