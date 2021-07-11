using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Windows.Forms;

namespace BladeSoulTool.lib
{
    class IconLoader
    {
        private static IconLoader _instance;

        public static IconLoader Instance
        {
            get 
            {
                if (_instance == null)
                {
                    _instance = new IconLoader();
                }
                return _instance;
            }
        }
        public static void CreateInstance()
        {
            if (_instance == null)
            {
                _instance = new IconLoader();
            }
        }
        
        private readonly Queue<IconLoadTask> _queue;
        private Thread _iconLoaderThread;

        private IconLoader()
        {
            _queue = new Queue<IconLoadTask>();
        }

        public void Run()
        {
            var isAnyTaskLeft = true;
            while (isAnyTaskLeft)
            {
                var task = _queue.Dequeue();

                // Loading image
                byte[] pic = null;
                
                var iconPath  = Manager.GetIconPath(task.ElementData);
                if (File.Exists(iconPath))
                {
                    pic = Manager.GetBytesFromFile(iconPath);
                }
                else
                {
                    iconPath = Manager.GetIconPath(task.ElementData);
                    pic = Manager.GetBytesFromFile(iconPath);
                }

                // Check the results and update the UI
                if (pic == null)
                {
                    Manager.ShowMsgInTextBox(task.Box, string.Format(I18NLoader.Instance.LoadI18NValue("BstIconLoader", "iconDownloadFailed"), iconPath));
                    // Update load failure icon
                    task.Table.Rows[task.RowId][task.ColId] = Manager.Instance.ErrorIconBytes;
                }
                else
                {
                    Manager.ShowMsgInTextBox(task.Box, string.Format(I18NLoader.Instance.LoadI18NValue("BstIconLoader", "iconDownloadSucceed"), iconPath));
                    // Update picture
                    task.Table.Rows[task.RowId][task.ColId] = pic;
                }
                
                // Still have work still not completed, continue to poll
                if (_queue.Count != 0) continue;

                // The current work queue has been emptied, the UI is finally updated, and the shutdown status is set.
                task.Grid.TryBeginInvoke(() => task.Grid.Invalidate());
                Manager.DisplayDataGridViewVerticalScrollBar(task.Grid);
                Manager.ShowMsgInTextBox(task.Box, I18NLoader.Instance.LoadI18NValue("BstIconLoader", "iconDownloadAllDone"));
                Logger.Log("[BstIconLoader] Queued works all done, thread exit ...");
                isAnyTaskLeft = false;
            }
        }

        public void RegisterTask(IconLoadTask task)
        {
            _queue.Enqueue(task);
        }

        public void Start()
        {
            _iconLoaderThread = new Thread(Run) { IsBackground = true };
            _iconLoaderThread.Start();
        }

        public void Stop()
        {
            _queue.Clear();
            if (_iconLoaderThread != null && _iconLoaderThread.IsAlive)
            {
                try
                {
                    _iconLoaderThread.Abort(); // Force exit if the thread is working
                }
                catch (Exception ex)
                {
                    Logger.Log(ex.ToString());
                }
            }
            _iconLoaderThread = null;
        }
    }
}
