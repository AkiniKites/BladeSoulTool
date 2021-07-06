@echo off

echo Running build_preparer...
grunt build_preparer
echo Finished build_preparer.

echo Running icon_dumper...
grunt icon_dumper
echo Finished icon_dumper.

echo Running upk_preparer...
grunt upk_preparer
echo Finished upk_preparer.

echo Running upk_scanner...
grunt upk_scanner
echo Finished upk_scanner.

echo Running upk_parser...
grunt upk_parser
echo Finished upk_parser.

echo Running shooter...
grunt shooter
echo Finished shooter.

echo Running png_optimizer...
grunt png_optimizer
echo Finished png_optimizer.