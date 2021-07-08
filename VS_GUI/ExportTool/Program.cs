using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
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
            if (args.Length != 5)
            {
                Console.WriteLine("Invalid number of arguments");
                return 1;
            }

            int pid = int.Parse(args[0]);
            int timeout = int.Parse(args[1]);

            int w = int.Parse(args[2]);
            int l = int.Parse(args[3]);

            string output = args[4];

            var hWnd = WaitForWindow(pid, timeout);
            ResizeWindow(hWnd, w, l);

            Thread.Sleep(250); //wait for repaint
            
            var img = GetScreenshot(hWnd);
            img.Save(output, ImageFormat.Png);

            CloseWindow(hWnd);

            return 0;
        }

        static IntPtr WaitForWindow(int pid, int timeout)
        {
            Process p = null;
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

            return hWnd;
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
    }
}
