@echo off
setlocal ENABLEDELAYEDEXPANSION
if defined CLASSPATH (set CLASSPATH=%CLASSPATH%;./bin) else (set CLASSPATH=./bin)
FOR /R .\lib %%G IN (*.jar) DO set CLASSPATH=!CLASSPATH!;%%G
Echo The Classpath definition is %CLASSPATH%
java -Xmx1024m -Djava.library.path=./lib de.cardcontact.scdp.scsh3.GUIShell

