using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Windows.Forms;

namespace BladeSoulTool.lib
{
    class BstIconLoader
    {
        private static BstIconLoader _instance;

        public static BstIconLoader Instance
        {
            get 
            {
                if (_instance == null)
                {
                    _instance = new BstIconLoader();
                }
                return _instance;
            }
        }

        // After downloading|reading how many icon images are read, refresh the UI. 
        // If the frequency is too fast, the refresh will kill the main interface.
        private const int UpdateThrottle = 30; 

        private readonly Queue<BstIconLoadTask> _queue;
        private Thread _iconLoaderThread;

        private BstIconLoader()
        {
            this._queue = new Queue<BstIconLoadTask>();
        }

        public void Run()
        {
            var updatedCount = 0;
            var isAnyTaskLeft = true;
            while (isAnyTaskLeft)
            {
                var task = this._queue.Dequeue();

                // Loading image
                byte[] pic = null;
                
                var iconPath  = BstManager.GetIconPath(task.ElementData);
                if (File.Exists(iconPath))
                {
                    pic = BstManager.GetBytesFromFile(iconPath);
                }
                else
                {
                    iconPath = BstManager.GetIconPath(task.ElementData, false);
                    pic = BstManager.GetBytesFromFile(iconPath);
                }

                // Check the results and update the UI
                if (pic == null)
                {
                    BstManager.ShowMsgInTextBox(task.Box, string.Format(BstI18NLoader.Instance.LoadI18NValue("BstIconLoader", "iconDownloadFailed"), iconPath));
                    // Update load failure icon
                    task.Table.Rows[task.RowId][task.ColId] = BstManager.Instance.ErrorIconBytes;
                }
                else
                {
                    BstManager.ShowMsgInTextBox(task.Box, string.Format(BstI18NLoader.Instance.LoadI18NValue("BstIconLoader", "iconDownloadSucceed"), iconPath));
                    // Update picture
                    task.Table.Rows[task.RowId][task.ColId] = pic;
                }

                // Check the icon loading progress and refresh ui
                updatedCount++;
                if (updatedCount >= BstIconLoader.UpdateThrottle)
                {
                    MethodInvoker tableUpdateAction = () => task.Grid.Refresh();
                    try
                    {
                        task.Grid.BeginInvoke(tableUpdateAction);
                    }
                    catch (Exception ex)
                    {
                        BstLogger.Instance.Log(ex.ToString());
                    }
                    updatedCount = 0;
                }

                // Still have work still not completed, continue to poll
                if (this._queue.Count != 0) continue;

                // The current work queue has been emptied, the UI is finally updated, and the shutdown status is set.
                MethodInvoker tableFinalUpdateAction = () => task.Grid.Refresh();
                task.Grid.BeginInvoke(tableFinalUpdateAction);
                BstManager.DisplayDataGridViewVerticalScrollBar(task.Grid);
                BstManager.ShowMsgInTextBox(task.Box, BstI18NLoader.Instance.LoadI18NValue("BstIconLoader", "iconDownloadAllDone"));
                BstLogger.Instance.Log("[BstIconLoader] Queued works all done, thread exit ...");
                isAnyTaskLeft = false;
            }
        }

        public void RegisterTask(BstIconLoadTask task)
        {
            this._queue.Enqueue(task);
        }

        public void Start()
        {
            this._iconLoaderThread = new Thread(this.Run) { IsBackground = true };
            this._iconLoaderThread.Start();
        }

        public void Stop()
        {
            this._queue.Clear();
            if (this._iconLoaderThread != null && this._iconLoaderThread.IsAlive)
            {
                try
                {
                    this._iconLoaderThread.Abort(); // Force exit if the thread is working
                }
                catch (Exception ex)
                {
                    BstLogger.Instance.Log(ex.ToString());
                }
            }
            this._iconLoaderThread = null;
        }
    }
}
