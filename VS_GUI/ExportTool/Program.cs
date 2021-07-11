using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Linq;
using System.Management;
using System.Runtime.InteropServices;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace ExportTool
{
    public class Program
    {
        static int Main(string[] args)
        {
            bool debug = args[0] == "debug";

            int pid = debug ? 0 : int.Parse(args[0]);
            int timeout = int.Parse(args[1]);

            int w = int.Parse(args[2]);
            int l = int.Parse(args[3]);

            bool crop = bool.Parse(args[4]);

            string output = args[5];

            var (hWnd, p) = WaitForWindow(pid, timeout, debug);

            try
            {
                Bitmap img;

                if (!crop)
                {
                    ResizeWindow(hWnd, w, l);
                    Thread.Sleep(250); //wait for repaint
                    img = GetScreenshot(hWnd);
                }
                else
                {
                    Thread.Sleep(250); //wait for repaint
                    var full = GetScreenshot(hWnd);
                    var outW = Math.Min(full.Width, w);
                    var outL = Math.Min(full.Height, l);

                    var x = (full.Width - outW) / 2;
                    var y = (full.Height - outL) / 2;
                    img = Crop(full, new Rectangle(x, y, outW, outL));
                }
                
                var dir = Path.GetDirectoryName(output);
                if (!String.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                    Directory.CreateDirectory(dir);
                img.Save(output, ImageFormat.Png);
            }
            finally
            {
                if (!debug)
                {
                    CloseWindow(hWnd);

                    if (!p.WaitForExit(timeout))
                        throw new InvalidOperationException("Process did not exit in time: " + pid);
                }
            }

            return 0;
        }

        static (IntPtr, Process) WaitForWindow(int pid, int timeout, bool debug)
        {
            Process p = null;
            if (debug)
            {
                p = Process.GetProcessesByName("umodel")[0];
            }
            else
            {
                if (!WaitFor(timeout, () =>
                {
                    var children = GetAllChildProcesses(pid);
                    if (!children.Any())
                        return false;

                    p = Process.GetProcessById(children[0]);
                    return true;
                }))
                {
                    throw new InvalidOperationException("Unable to find child process with pid: " + pid);
                }
            }

            IntPtr hWnd = IntPtr.Zero;
            if (!WaitFor(timeout, () =>
            {
                if (p.MainWindowHandle == IntPtr.Zero)
                    return false;
                hWnd = p.MainWindowHandle;
                return true;
            }))
            {
                throw new InvalidOperationException("Unable to find window for process with pid: " + pid);
            }

            return (hWnd, p);
        }

        static int[] GetAllChildProcesses(int pid)
        {
            var searcher = new ManagementObjectSearcher(
                $"select ProcessId from Win32_Process where ParentProcessId={pid}");
            var results = searcher.Get();

            return results.Cast<ManagementBaseObject>().Select(x => (int)(uint)x["ProcessId"]).ToArray();
        }

        static bool WaitFor(int timeout, Func<bool> action)
        {
            var sw = new Stopwatch();
            sw.Start();
            while (sw.ElapsedMilliseconds < timeout)
            {
                if (action())
                    return true;
                Thread.Sleep(100);
            }

            return false;
        }

        static void ResizeWindow(IntPtr hWnd, int width, int height)
        {
            if (!Win32.GetWindowRect(hWnd, out var rect))
                throw new InvalidOperationException("Unable to find window area for hWnd: " + hWnd);
            Win32.MoveWindow(hWnd, rect.X, rect.Y, width, height, false);
        }

        static Bitmap GetScreenshot(IntPtr hWnd)
        {
            if (!Win32.GetClientRect(hWnd, out var rect))
                throw new InvalidOperationException("Unable to find window area for hWnd: " + hWnd);

            var img = new Bitmap(rect.Width, rect.Height);
            using (Graphics g = Graphics.FromImage(img))
            {
                var hDC = g.GetHdc();

                try
                {
                    Win32.PrintWindow(hWnd, hDC, Win32.PW_CLIENTONLY);
                }
                finally
                {
                    g.ReleaseHdc(hDC);
                }
            }

            return img;
        }

        static void CloseWindow(IntPtr hWnd)
        {
            Win32.SendMessage(hWnd, Win32.WM_CLOSE, IntPtr.Zero, IntPtr.Zero);
        }

        static Bitmap Crop(Bitmap image, Rectangle area)
        {
            var result = new Bitmap(area.Width, area.Height, image.PixelFormat);

            unsafe
            {
                var bmd = image.LockBits(area, ImageLockMode.ReadOnly, image.PixelFormat);
                var bmdOut = result.LockBits(new Rectangle(0, 0, area.Width, area.Height),
                    ImageLockMode.WriteOnly, result.PixelFormat);

                int pixelSize = Image.GetPixelFormatSize(image.PixelFormat) / 8;
                
                var to = (byte*)bmdOut.Scan0 - 1 * bmdOut.Stride;
                var from = (byte*)bmd.Scan0 - 1 * bmd.Stride;

                //Copy the memory from each row in the first bitmap to second
                for (int y = 0; y < bmd.Height; y++)
                {
                    to += bmdOut.Stride;
                    from += bmd.Stride;

                    Win32.MoveMemory(to, from, area.Width * pixelSize);
                }

                image.UnlockBits(bmd);
                result.UnlockBits(bmdOut);
            }

            return result;
        }
    }
}
