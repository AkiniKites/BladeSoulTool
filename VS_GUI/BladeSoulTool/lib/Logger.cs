using System;
using System.IO;
using System.Text;
using System.Timers;

namespace BladeSoulTool.lib
{
    public static class Logger
    {
        private static readonly StringBuilder _buffer = new StringBuilder();
        private static readonly object _lock = new object();

        static Logger()
        {
            var logPath = Manager.PathVsRoot + Manager.PathVsLog + DateTime.Now.ToString("yyyy-MM-dd_HH-mm-ss-ffff") + ".log";
            
            var timer = new Timer(5000);
            timer.Elapsed += (sender, args) =>
            {
                string toWrite = null;
                lock (_lock)
                {
                    toWrite = _buffer.ToString();
                    _buffer.Clear();
                }

                if (!string.IsNullOrEmpty(toWrite))
                    File.AppendAllText(logPath, toWrite);
            };
            timer.AutoReset = true;
            timer.Enabled = true;
        }

        public static void Log(string msg)
        {
            lock(_lock)
            {
                _buffer.AppendLine(DateTime.Now.ToString("yyyy-MM-dd_HH-mm-ss-ffff") + " " + msg);
            }
        }
    }
}
