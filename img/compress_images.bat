@echo none
for /d /r %%a in (*) do (
   pushd "%%a"
     echo processing "%%a"
     md "OptimizedJPEGS" 
        for %%i in (*.JPG) do "jpegtran" -optimize -progressive -copy none "%%i" "OptimizedJPEGS\%%i"
        move /Y "OptimizedJPEGS\*.*" .
     rd "OptimizedJPEGS"
   popd
)