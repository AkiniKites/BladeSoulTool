using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace BladeSoulTool.lib
{
    public class IconLoader
    {
        private BlockingCollection<IconLoadTask> _queue;
        private Task _loaderTask;

        public DataGridView Grid { get; }
        public TextBox StatusBox { get; }

        public IconLoader(DataGridView grid, TextBox statusBox)
        {
            Grid = grid;
            StatusBox = statusBox;

            _queue = new BlockingCollection<IconLoadTask>();
        }

        public void Run()
        {
            foreach (var task in _queue.GetConsumingEnumerable())
            {
                // Loading image
                var iconPath = Manager.GetIconPath(task.ElementData);
                var pic = Utility.GetBytesFromFile(iconPath);

                // Check the results and update the UI
                if (pic == null)
                {
                    Manager.ShowMsgInTextBox(StatusBox, string.Format(I18NLoader.Instance.LoadI18NValue("BstIconLoader", "iconDownloadFailed"), iconPath));
                    // Update load failure icon
                    task.Table.Rows[task.RowId][task.ColId] = Manager.Instance.ErrorIconBytes;
                }
                else
                {
                    Manager.ShowMsgInTextBox(StatusBox, string.Format(I18NLoader.Instance.LoadI18NValue("BstIconLoader", "iconDownloadSucceed"), iconPath));
                    // Update picture
                    task.Table.Rows[task.RowId][task.ColId] = pic;
                }
            }
            
            // The current work queue has been emptied, the UI is finally updated, and the shutdown status is set.
            Grid.TryBeginInvoke(() =>
            {
                Grid.ScrollBars = ScrollBars.None;
                Grid.ScrollBars = ScrollBars.Vertical;
                Grid.Invalidate();
            });

            Manager.ShowMsgInTextBox(StatusBox, I18NLoader.Instance.LoadI18NValue("BstIconLoader", "iconDownloadAllDone"));
            Logger.Log("[BstIconLoader] Queued works all done, thread exit ...");
        }

        public void AddTask(IconLoadTask task)
        {
            _queue.Add(task);
        }
        
        public void Start()
        {
            _loaderTask = Task.Run(Run);

            if (!_queue.IsAddingCompleted)
                _queue.CompleteAdding();
        }

        public void Stop()
        {
            if (!_queue.IsAddingCompleted)
                _queue.CompleteAdding();

            _loaderTask?.Wait();
            _loaderTask = null;
            _queue = new BlockingCollection<IconLoadTask>();
        }
    }
}
