@echo off
setlocal ENABLEDELAYEDEXPANSION
set userdir=%CD%
cd /d %~dp0
if defined CLASSPATH (set CLASSPATH=%CLASSPATH%;./bin) else (set CLASSPATH=./bin)
FOR /R .\lib %%G IN (*.jar) DO set CLASSPATH=!CLASSPATH!;%%G
Echo The Classpath definition is %CLASSPATH%
java -Xmx512m -Djava.library.path=./lib -Dscdp.workspace=%userdir% de.cardcontact.scdp.engine.ScriptRunner %*
if errorlevel 1 goto failed
echo completed...
goto end

:failed
echo failed...

:end
cd /d %userdir%

