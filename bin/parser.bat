@echo off

set /p part="Enter part [body|face|hair]: " %=%

cd ..
grunt parser --part=%part% --stack & pause > nul