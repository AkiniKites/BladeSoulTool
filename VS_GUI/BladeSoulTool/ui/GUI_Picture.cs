using System.Windows.Forms;
using BladeSoulTool.lib;

namespace BladeSoulTool.ui
{
    public partial class GuiPicture : Form
    {
        public GuiPicture(int type, string elementId, TextBox box)
        {
            InitializeComponent();

            Shown += (s, e) => BstPicLoader.LoadPic(type, elementId, pictureBox2D, box); // 页面展示后的事件
        }
    }
}
