using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Windows.Forms;
using Newtonsoft.Json.Linq;
using Timer = System.Timers.Timer;

namespace BladeSoulTool.lib
{
    class PicLoader
    {
        private static readonly Dictionary<PictureBox, Timer> LoadingTimers = new Dictionary<PictureBox, Timer>();

        public static void LoadPic(int type, string elementId, PictureBox picture, TextBox box = null)
        {
            var data = Manager.Instance.GetAllDataByType(type);
            var elementData = (JObject) data[elementId];

            LoadPic(type, elementData, picture, box);
        }

        public static void LoadPic(int type, JObject elementData, PictureBox picture, TextBox box = null)
        {
            //var url = BstManager.GetItemPicUrl(type, elementData);
            //var path = BstManager.GetItemPicTmpPath(type, elementData);

            RunLoading(type, elementData, picture, box);
        }

        private static void RunLoading(int type, JObject elementData, PictureBox picture, TextBox box = null)
        {
            new Thread(() =>
            {
                Timer loadingTimer = null;
                if (!LoadingTimers.ContainsKey(picture))
                {
                    // Update the image into the read state. 
                    // If the Timer of the PictureBox already exists in the Dictionary, the loading map is already loaded.
                    var loadingGif = new GifImage(Manager.PathLoadingGif) { ReverseAtEnd = false };
                    loadingTimer = new Timer(50);
                    loadingTimer.Elapsed += (s, e) =>
                    {
                        try
                        {
                            picture.TryBeginInvoke(() => picture.Image = loadingGif.GetNextFrame());
                        }
                        catch (InvalidOperationException ex)
                        {
                            Logger.Log(ex.ToString());
                            // Because we may display the loading dynamic graph in the PictureBox in the GUI of the GUI_Picture.
                            // The above window may be destroyed after being closed.Here we need to handle the error after the window is destroyed.
                            // At this time, Timer should be registered in the Dictionary.
                            if (LoadingTimers.ContainsKey(picture))
                            {
                                var timer = LoadingTimers[picture];
                                timer.Enabled = false;
                                LoadingTimers.Remove(picture);
                                timer.Dispose();
                            }
                        }
                    };
                    LoadingTimers.Add(picture, loadingTimer);
                    loadingTimer.Enabled = true;
                }
                else
                {
                    loadingTimer = LoadingTimers[picture];
                }

                byte[] blob = null;

                var imgpath = Manager.GetItemPicPath(type, elementData);
                // Check if there is a local cache
                if (File.Exists(imgpath))
                {
                    // Local cache exists, read directly
                    blob = Manager.GetBytesFromFile(imgpath);
                }
                else
                {
                    imgpath = Manager.GetItemPicPath(type, elementData);
                    blob = Manager.GetBytesFromFile(imgpath);
                }

                if (blob == null)
                {
                    Manager.ShowMsgInTextBox(box, string.Format(I18NLoader.Instance.LoadI18NValue("BstPicLoader", "picDownloadFailed"), imgpath));
                    
                    blob = Manager.Instance.ErrorIconBytes;
                }
                else
                {
                    Manager.ShowMsgInTextBox(box, string.Format(I18NLoader.Instance.LoadI18NValue("BstPicLoader", "picDownloadSucceed"), imgpath));
                }

                loadingTimer.Enabled = false;
                LoadingTimers.Remove(picture);
                loadingTimer.Dispose();

                var bitmap = Manager.ConvertByteToImage(blob);
                try
                {
                    picture.TryBeginInvoke(()=> picture.Image = bitmap);
                }
                catch (Exception ex)
                {
                    Logger.Log(ex.ToString());
                }
            }).Start();
        }
    }
}
