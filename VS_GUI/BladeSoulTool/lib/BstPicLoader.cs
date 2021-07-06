using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Windows.Forms;
using Newtonsoft.Json.Linq;
using Timer = System.Timers.Timer;

namespace BladeSoulTool.lib
{
    class BstPicLoader
    {
        private static readonly Dictionary<PictureBox, Timer> LoadingTimers = new Dictionary<PictureBox, Timer>();

        public static void LoadPic(int type, string elementId, PictureBox picture, TextBox box = null)
        {
            var data = BstManager.Instance.GetAllDataByType(type);
            var elementData = (JObject) data[elementId];

            BstPicLoader.LoadPic(type, elementData, picture, box);
        }

        public static void LoadPic(int type, JObject elementData, PictureBox picture, TextBox box = null)
        {
            //var url = BstManager.GetItemPicUrl(type, elementData);
            //var path = BstManager.GetItemPicTmpPath(type, elementData);

            BstPicLoader.RunLoading(type, elementData, picture, box);
        }

        private static void RunLoading(int type, JObject elementData, PictureBox picture, TextBox box = null)
        {
            new Thread(() =>
            {
                Timer loadingTimer = null;
                if (!BstPicLoader.LoadingTimers.ContainsKey(picture))
                {
                    // Update the image into the read state. 
                    // If the Timer of the PictureBox already exists in the Dictionary, the loading map is already loaded.
                    var loadingGif = new BstGifImage(BstManager.PathLoadingGif) { ReverseAtEnd = false };
                    loadingTimer = new Timer(50);
                    loadingTimer.Elapsed += (s, e) =>
                    {
                        MethodInvoker loadingAction = () =>
                        {
                            picture.Image = loadingGif.GetNextFrame();
                        };
                        try
                        {
                            picture.BeginInvoke(loadingAction);
                        }
                        catch (InvalidOperationException ex)
                        {
                            BstLogger.Instance.Log(ex.ToString());
                            // Because we may display the loading dynamic graph in the PictureBox in the GUI of the GUI_Picture.
                            // The above window may be destroyed after being closed.Here we need to handle the error after the window is destroyed.
                            // At this time, Timer should be registered in the Dictionary.
                            if (BstPicLoader.LoadingTimers.ContainsKey(picture))
                            {
                                var timer = BstPicLoader.LoadingTimers[picture];
                                timer.Enabled = false;
                                BstPicLoader.LoadingTimers.Remove(picture);
                                timer.Dispose();
                            }
                        }
                    };
                    BstPicLoader.LoadingTimers.Add(picture, loadingTimer);
                    loadingTimer.Enabled = true;
                }
                else
                {
                    loadingTimer = BstPicLoader.LoadingTimers[picture];
                }

                byte[] blob = null;

                var imgpath = BstManager.GetItemPicPath(type, elementData);
                // Check if there is a local cache
                if (File.Exists(imgpath))
                {
                    // Local cache exists, read directly
                    blob = BstManager.GetBytesFromFile(imgpath);
                }
                else
                {
                    imgpath = BstManager.GetItemPicPath(type, elementData, false);
                    blob = BstManager.GetBytesFromFile(imgpath);
                }

                if (blob == null)
                {
                    BstManager.ShowMsgInTextBox(box, string.Format(BstI18NLoader.Instance.LoadI18NValue("BstPicLoader", "picDownloadFailed"), imgpath));
                    
                    blob = BstManager.Instance.ErrorIconBytes;
                }
                else
                {
                    BstManager.ShowMsgInTextBox(box, string.Format(BstI18NLoader.Instance.LoadI18NValue("BstPicLoader", "picDownloadSucceed"), imgpath));
                }

                loadingTimer.Enabled = false;
                BstPicLoader.LoadingTimers.Remove(picture);
                loadingTimer.Dispose();

                var bitmap = BstManager.ConvertByteToImage(blob);
                MethodInvoker updateAction = () => picture.Image = bitmap;
                try
                {
                    picture.BeginInvoke(updateAction);
                }
                catch (Exception ex)
                {
                    BstLogger.Instance.Log(ex.ToString());
                }
            }).Start();
        }
    }
}
