@echo off

echo Running build_preparer...
cmd /c grunt build_preparer
echo Finished build_preparer.

echo Running icon_dumper...
cmd /c grunt icon_dumper
echo Finished icon_dumper.

echo Running upk_preparer...
cmd /c grunt upk_preparer
echo Finished upk_preparer.

echo Running upk_scanner...
cmd /c grunt upk_scanner
echo Finished upk_scanner.

echo Running upk_parser...
cmd /c grunt upk_parser
echo Finished upk_parser.

