@echo off
setlocal ENABLEDELAYEDEXPANSION
set userdir=%CD%
cd /d %~dp0
if defined CLASSPATH (set CLASSPATH=%CLASSPATH%;./bin) else (set CLASSPATH=./bin)
FOR /R .\lib %%G IN (*.jar) DO set CLASSPATH=!CLASSPATH!;%%G
Echo The Classpath definition is %CLASSPATH%
if exist jre (set JAVAW=jre\bin\javaw) else (set JAVAW=javaw)
Echo Starting %JAVAW%
start %JAVAW% -Xmx1024m -Dsun.security.smartcardio.t1GetResponse=false -Dorg.bouncycastle.asn1.allow_unsafe_integer=true -Djava.library.path=./lib de.cardcontact.scdp.scsh3.GUIShell
