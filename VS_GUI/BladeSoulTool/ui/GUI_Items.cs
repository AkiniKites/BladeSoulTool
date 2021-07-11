using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;
using BladeSoulTool.lib;
using Newtonsoft.Json.Linq;

namespace BladeSoulTool.ui
{
    public partial class GuiItems : UserControl
    {

        private int _formType;

        private DataTable _dataTable;

        private JObject _data;

        private string _selectedElementId;
        private string _originElementId;
        private string _targetElementId;

        private Thread _loadingThread;

        private JObject _originSettings;

        private BstI18NLoader _i18N;

        public GuiItems(int formType)
        {
            InitializeComponent();
            InitI18N();
            Init(formType);

            LoadItemList();
        }

        private void InitI18N()
        {
            _i18N = BstI18NLoader.Instance;
            labelRace.Text = _i18N.LoadI18NValue("GuiItems", "labelRace");
            btnView2DOrigin.Text = _i18N.LoadI18NValue("GuiItems", "btnView2D");
            btnView3DOrigin.Text = _i18N.LoadI18NValue("GuiItems", "btnView3D");
            labelOrigin.Text = _i18N.LoadI18NValue("GuiItems", "labelOrigin");
            btnView2DTarget.Text = _i18N.LoadI18NValue("GuiItems", "btnView2D");
            btnView3DTarget.Text = _i18N.LoadI18NValue("GuiItems", "btnView3D");
            labelTarget.Text = _i18N.LoadI18NValue("GuiItems", "labelTarget");
            btnTopRestoreAll.Text = _i18N.LoadI18NValue("GuiItems", "btnTopRestoreAll");
            btnView3DInfo.Text = _i18N.LoadI18NValue("GuiItems", "btnView3D");
            btnSelectTarget.Text = _i18N.LoadI18NValue("GuiItems", "btnSelectTarget");
            btnSelectOrigin.Text = _i18N.LoadI18NValue("GuiItems", "btnSelectOrigin");
            labelInfoHead.Text = _i18N.LoadI18NValue("GuiItems", "labelInfoHead");
            btnReplace.Text = _i18N.LoadI18NValue("GuiItems", "btnReplace");
            labelRestore.Text = _i18N.LoadI18NValue("GuiItems", "labelRestore");
            labelFilter.Text = _i18N.LoadI18NValue("GuiItems", "labelFilter");
            btnFilter.Text = _i18N.LoadI18NValue("GuiItems", "btnFilter");
        }

        private void Init(int formType)
        {
            _formType = formType;
            _originSettings = BstManager.ReadJsonFile(BstManager.GetItemOriginJsonPath(_formType));
            // 数据列表
            _dataTable = new DataTable();
            // icon列
            var columnIcon = new DataColumn("Icon")
            {
                DataType = Type.GetType("System.Byte[]"),
                AllowDBNull = true,
                ColumnName = _i18N.LoadI18NValue("GuiItems", "tableColIcon")
            };
            //columnIcon.ReadOnly = true;
            _dataTable.Columns.Add(columnIcon);
            // code列
            var columnCode = new DataColumn("Code") {
                ColumnName = _i18N.LoadI18NValue("GuiItems", "tableColCode"),
                ReadOnly = true
            };
            _dataTable.Columns.Add(columnCode);

            // 数据展示列表
            gridItems.DataSource = _dataTable;
            gridItems.RowTemplate.Height = 64;
            // icon列
            var gridColumnIcon = gridItems.Columns[0];
            gridColumnIcon.AutoSizeMode = DataGridViewAutoSizeColumnMode.None;
            gridColumnIcon.Width = 64;

            this.gridItems.SelectionChanged += GridItemsOnSelectionChanged;
            // 展示列表点击事件
            //this.gridItems.CellClick += new DataGridViewCellEventHandler(this.gridItems_CellClick);
            // 展示列表鼠标滚轴事件
            //this.gridItems.MouseWheel += new MouseEventHandler(this.gridItems_MouseWheel);

            // 种族选择控件
            // ReSharper disable once CoVariantArrayConversion
            comboBoxRace.Items.AddRange(BstManager.Instance.RaceNames.ToArray());
            comboBoxRace.SelectedIndex = 0;
            comboBoxRace.SelectedIndexChanged += new EventHandler(comboBoxRace_SelectedIndexChanged);

            // 查找模型控件
            btnFilter.Click += new EventHandler(btnFilter_Click);

            // 全部恢复按钮
            btnTopRestoreAll.Click += new EventHandler(btnTopRestoreAll_Click);
            // 预览原始模型2D截图
            btnView2DOrigin.Click += new EventHandler(btnView2DOrigin_Click);
            // 预览原始模型3D模型
            btnView3DOrigin.Click += new EventHandler(btnView3DOrigin_Click);
            // 预览目标模型2D截图
            btnView2DTarget.Click += new EventHandler(btnView2DTarget_Click);
            // 预览目标模型3D模型
            btnView3DTarget.Click += new EventHandler(btnView3DTarget_Click);
            // 替换按钮
            btnReplace.Click += new EventHandler(btnReplace_Click);

            // 展示选中物件的3D模型按钮
            btnView3DInfo.Click += new EventHandler(btnView3DInfo_Click);
            // 选为原始模型按钮
            btnSelectOrigin.Click += new EventHandler(btnSelectOrigin_Click);
            // 选为目标模型按钮
            btnSelectTarget.Click += new EventHandler(btnSelectTarget_Click);
        }
        
        private void LoadItemList(int raceType = BstManager.RaceIdKunn)
        {
            if (_loadingThread != null && _loadingThread.IsAlive)
            {
                // 之前启动的加载线程还活着，需要先停止
                try
                {
                    _loadingThread.Abort();
                }
                catch (Exception ex)
                {
                    BstLogger.Instance.Log(ex.ToString());
                }
                _loadingThread = null;
            }

            ClearFormStatus(); // 清理旧的数据

            // 启动新的线程来处理数据加载内容
            _loadingThread = new Thread(() =>
            {
                BstManager.ShowMsgInTextBox(textBoxOut, _i18N.LoadI18NValue("GuiItems", "logStartToLoadDataList"));

                //BstManager.HideDataGridViewVerticalScrollBar(this.gridItems); // 隐藏滚动条

                // 更新原始模型区块数据
                JObject originData = null;
                if (_formType == BstManager.TypeAttach
                    || _formType == BstManager.TypeCostume)
                {
                    var race = BstManager.Instance.RaceTypes[raceType];
                    var data = (JObject) _originSettings[race];
                    if (data != null)
                    {
                        _originElementId = (string) data["id"];
                        originData = (JObject) data["data"];
                    }
                }
                else
                {
                    if (_originSettings["id"] != null)
                    {
                        _originElementId = (string) _originSettings["id"];
                        originData = (JObject) _originSettings["data"];
                    }
                }
                if (originData != null)
                {
                    LoadOriginAndTargetIconPic(pictureBoxOrigin, originData, true);
                    BstManager.ShowMsgInTextBox(textBoxOrigin, originData.ToString(), false);
                }

                // 初始化list数据
                switch (_formType)
                {
                    case BstManager.TypeCostume:
                        _data = BstManager.Instance.GetCostumeDataByRace(raceType);
                        break;
                    case BstManager.TypeAttach:
                        _data = BstManager.Instance.GetAttachDataByRace(raceType);
                        break;
                    case BstManager.TypeWeapon:
                        _data = BstManager.Instance.DataWeapon;
                        break;
                }
                // 加载list界面
                foreach (var element in _data.Properties())
                {
                    // 读取数据
                    var elementId = element.Name;
                    var elementData = (JObject) element.Value;
                    // 填充数据
                    // 这里暂时不考虑做成动态的gif动画，考虑到列表里的项可能比较多，那么多timer更新gif动态图可能造成性能问题
                    _dataTable.Rows.Add(new object[] { BstManager.Instance.LoadingGifBytes, elementId }); 
                    var rowId = _dataTable.Rows.Count - 1;
                    BstIconLoader.Instance.RegisterTask(new BstIconLoadTask(
                        elementData, gridItems, _dataTable, rowId, textBoxOut
                    ));
                }

                BstManager.ShowMsgInTextBox(textBoxOut, _i18N.LoadI18NValue("GuiItems", "logEndLoadDataList"));
                BstIconLoader.Instance.Start(); // 启动图片加载器
            });
            _loadingThread.Start();
        }

        private void ClearFormStatus()
        {
            // 重置form的状态
            _selectedElementId = null;
            _originElementId = null;
            _targetElementId = null;

            textBoxInfo.Text = null;
            textBoxOrigin.Text = null;
            textBoxTarget.Text = null;
            textBoxOut.Text = null;

            pictureBoxOrigin.Image = null;
            pictureBoxTarget.Image = null;
            pictureBoxUmodel.Image = null;

            _data = null;
            _dataTable.Clear();

            // 清空之前的加载队列，准备重新填充加载内容
            BstIconLoader.Instance.Stop();
        }
        
        private void GridItemsOnSelectionChanged(object sender, EventArgs e)
        {
            if (gridItems.CurrentRow == null)
                return;

            // 查找该行对应的数据
            _selectedElementId = (string)gridItems.Rows[gridItems.CurrentRow.Index].Cells[1].Value;
            var elementData = (JObject)_data[_selectedElementId];
            textBoxInfo.Text = elementData.ToString();
            // 模型截图控件
            BstPicLoader.LoadPic(_formType, elementData, pictureBoxUmodel, textBoxOut);
        }

        private void gridItems_CellClick(object sender, DataGridViewCellEventArgs e)
        {
            if (e.RowIndex < 0 || e.RowIndex > (gridItems.RowCount - 1))
            {
                return; // 索引越界
            }
            // 数据展示列表的点击事件
            gridItems.Rows[e.RowIndex].Selected = true;
            gridItems.Refresh();
            // 查找该行对应的数据
            _selectedElementId = (string) gridItems.Rows[e.RowIndex].Cells[1].Value;
            var elementData = (JObject) _data[_selectedElementId];
            textBoxInfo.Text = elementData.ToString();
            // 模型截图控件
            BstPicLoader.LoadPic(_formType, elementData, pictureBoxUmodel, textBoxOut);
        }

        private void gridItems_MouseWheel(Object sender, MouseEventArgs e)
        {
            // 数据展示列表的鼠标滚轴事件
            var currentIndex = gridItems.FirstDisplayedScrollingRowIndex;
            var scrollLines = SystemInformation.MouseWheelScrollLines;

            if (e.Delta > 0)
            {
                gridItems.FirstDisplayedScrollingRowIndex = Math.Max(0, currentIndex - scrollLines);
            }
            else if (e.Delta < 0)
            {
                gridItems.FirstDisplayedScrollingRowIndex = currentIndex + scrollLines;
            }
        }

        private void comboBoxRace_SelectedIndexChanged(Object sender, EventArgs e)
        {
            // 重新选择种族，即重新加载界面
            LoadItemList(comboBoxRace.SelectedIndex);
        }

        private void btnFilter_Click(Object sender, EventArgs e)
        {
            // 查找模型
            var targetModelCode = textBoxFilter.Text;
            if (String.IsNullOrEmpty(targetModelCode))
            {
                return; // 查找字符串未空，忽略
            }

            // 决定开始查找行，查找行为只会顺序向下查找，不会回归到第一行
            var startRowIndex = 0;
            if (gridItems.SelectedRows.Count > 0) // 如果有选中的行，则从选中那行之后开始查找
            {
                Console.WriteLine("Has selected items ...");
                startRowIndex = gridItems.SelectedRows[0].Index + 1;
                if (startRowIndex > gridItems.RowCount - 1)
                {
                    startRowIndex = gridItems.RowCount - 1;
                }
            }

            for (var i = startRowIndex; i < gridItems.RowCount - 1; i++)
            {
                var elementId = (string) gridItems.Rows[i].Cells[1].Value;
                var elementData = (JObject) _data[elementId];
                var core = (string) elementData["core"];
                if (Regex.IsMatch(core, targetModelCode))
                {
                    // 数据展示列表的点击事件
                    gridItems.Rows[i].Selected = true;
                    gridItems.Refresh();
                    // 更新查找到的内容对应的数据
                    _selectedElementId = elementId;
                    textBoxInfo.Text = elementData.ToString();
                    // 模型截图控件
                    BstPicLoader.LoadPic(_formType, elementData, pictureBoxUmodel, textBoxOut);
                    // 更新列表展示位置
                    gridItems.FirstDisplayedScrollingRowIndex = i;
                    break;
                }
            }
        }

        private void btnTopRestoreAll_Click(Object sender, EventArgs e)
        {
            // 恢复全部模型
            if (BstManager.DisplayConfirmMessageBox(
                _i18N.LoadI18NValue("GuiItems", "actionConfirmTitle"),
                _i18N.LoadI18NValue("GuiItems", "actionRestoreMsg")) == DialogResult.OK)
            {
                BstManager.Instance.RunGrunt(textBoxOut, true, "restore");
            }
        }

        private void btnView2DOrigin_Click(Object sender, EventArgs e)
        {
            // 预览原始模型2D截图
            if (_originElementId == null)
            {
                BstManager.DisplayErrorMessageBox(
                    _i18N.LoadI18NValue("GuiItems", "actionSelectErrorTitle"),
                    _i18N.LoadI18NValue("GuiItems", "actionSelectOriginErrorMsg")
                );
                return;
            }
            CreatePictureForm(_originElementId);
        }

        private void btnView3DOrigin_Click(Object sender, EventArgs e)
        {
            // 预览原始模型的3D模型
            if (_originElementId == null)
            {
                BstManager.DisplayErrorMessageBox(
                    _i18N.LoadI18NValue("GuiItems", "actionSelectErrorTitle"),
                    _i18N.LoadI18NValue("GuiItems", "actionSelectOriginErrorMsg")
                );
                return;
            }
            BstManager.Instance.RunGrunt(textBoxOut, false, "upk_viewer", new string[]
            {
                "--part=" + BstManager.GetTypeName(_formType),
                "--model=" + _originElementId
            });
        }

        private void btnView2DTarget_Click(Object sender, EventArgs e)
        {
            // 预览目标模型2D截图
            if (_targetElementId == null)
            {
                BstManager.DisplayErrorMessageBox(
                    _i18N.LoadI18NValue("GuiItems", "actionSelectErrorTitle"),
                    _i18N.LoadI18NValue("GuiItems", "actionSelectTargetErrorMsg")
                );
                return;
            }
            CreatePictureForm(_targetElementId);
        }

        private void btnView3DTarget_Click(Object sender, EventArgs e)
        {
            // 预览目标模型的3D模型
            if (_targetElementId == null)
            {
                BstManager.DisplayErrorMessageBox(
                    _i18N.LoadI18NValue("GuiItems", "actionSelectErrorTitle"),
                    _i18N.LoadI18NValue("GuiItems", "actionSelectTargetErrorMsg")
                );
                return;
            }
            BstManager.Instance.RunGrunt(textBoxOut, false, "upk_viewer", new string[]
            {
                "--part=" + BstManager.GetTypeName(_formType),
                "--model=" + _targetElementId
            });
        }

        private void btnReplace_Click(Object sender, EventArgs e)
        {
            // 替换模型
            if (_originElementId == null)
            {
                BstManager.DisplayErrorMessageBox(
                    _i18N.LoadI18NValue("GuiItems", "actionReplaceErrorTitle"),
                    _i18N.LoadI18NValue("GuiItems", "actionOriginEmptyErrorMsg")
                );
                return;
            }
            if (_targetElementId == null)
            {
                BstManager.DisplayErrorMessageBox(
                    _i18N.LoadI18NValue("GuiItems", "actionReplaceErrorTitle"),
                    _i18N.LoadI18NValue("GuiItems", "actionTargetEmptyErrorMsg")
                );
                return;
            }
            if (_originElementId == _targetElementId)
            {
                BstManager.DisplayErrorMessageBox(
                    _i18N.LoadI18NValue("GuiItems", "actionReplaceErrorTitle"),
                    _i18N.LoadI18NValue("GuiItems", "actionTargetSameErrorMsg")
                );
                return;
            }
            if (_formType == BstManager.TypeWeapon) // 只有武器不可替换
            {
                // FIXME 后续制作功能，并开发这个限制
                BstManager.DisplayErrorMessageBox(
                    _i18N.LoadI18NValue("GuiItems", "actionFuncNotDoneTitle"),
                    _i18N.LoadI18NValue("GuiItems", "actionWaitForFuncMsg")
                );
                return;
            }
            if (BstManager.DisplayConfirmMessageBox(
                _i18N.LoadI18NValue("GuiItems", "actionConfirmTitle"),
                _i18N.LoadI18NValue("GuiItems", "actionReplaceMsg")) == DialogResult.OK)
            {
                string race = null;
                if (_formType == BstManager.TypeAttach
                    || _formType == BstManager.TypeCostume)
                {
                    race = BstManager.Instance.RaceTypes[comboBoxRace.SelectedIndex];
                }
                BstManager.Instance.RunGrunt(textBoxOut, false, "replace", new string[]
                {
                    "--part=" + BstManager.GetTypeName(_formType),
                    "--model=" + _targetElementId,
                    "--race=" + race
                });
            }
        }

        private void btnView3DInfo_Click(Object sender, EventArgs e)
        {
            // 预览选中的对象的3D模型
            if (_selectedElementId == null)
            {
                BstManager.DisplayErrorMessageBox(
                    _i18N.LoadI18NValue("GuiItems", "actionSelectErrorTitle"),
                    _i18N.LoadI18NValue("GuiItems", "actionSelectTargetErrorMsg")
                );
                return;
            }
            BstManager.Instance.RunGrunt(textBoxOut, false, "upk_viewer", new string[]
            {
                "--part=" + BstManager.GetTypeName(_formType),
                "--model=" + _selectedElementId
            });
        }

        private void btnSelectOrigin_Click(Object sender, EventArgs e)
        {
            // 将当前选中的物件设为原始模型
            if (_selectedElementId == null)
            {
                BstManager.DisplayErrorMessageBox(
                    _i18N.LoadI18NValue("GuiItems", "actionSelectErrorTitle"),
                    _i18N.LoadI18NValue("GuiItems", "actionSelectTargetErrorMsg")
                );
                return; // 没有选中的元素，直接退出
            }
            var element = (JObject) _data[_selectedElementId];
            _originElementId = _selectedElementId;
            // 展示icon，该icon应该已经有本地缓存，直接读取本地缓存
            LoadOriginAndTargetIconPic(pictureBoxOrigin, element);
            // 显示模型数据
            textBoxOrigin.Text = element.ToString();
            // 存储原始模型数据
            var originData = new JObject();
            originData["id"] = _originElementId;
            originData["data"] = element;
            if (_formType == BstManager.TypeAttach
                || _formType == BstManager.TypeCostume)
            {
                var originRace = (string) element["race"];
                if (Regex.IsMatch(originRace, BstManager.Instance.RaceTypes[BstManager.RaceIdLyn], RegexOptions.IgnoreCase))
                {
                    originRace = BstManager.Instance.RaceTypes[BstManager.RaceIdLyn];
                }
                _originSettings[originRace] = originData;
            }
            else
            {
                _originSettings = originData;
            }
            BstManager.WriteJsonFile(BstManager.GetItemOriginJsonPath(_formType), _originSettings);
        }

        private void btnSelectTarget_Click(Object sender, EventArgs e)
        {
            // 将当前选中的物件设为目标模型
            if (_selectedElementId == null)
            {
                BstManager.DisplayErrorMessageBox(
                    _i18N.LoadI18NValue("GuiItems", "actionSelectErrorTitle"),
                    _i18N.LoadI18NValue("GuiItems", "actionSelectTargetErrorMsg")
                );
                return; // 没有选中的元素，直接退出
            }
            _targetElementId = _selectedElementId;
            var element = (JObject) _data[_selectedElementId];
            // 展示icon，该icon应该已经有本地缓存，直接读取本地缓存
            LoadOriginAndTargetIconPic(pictureBoxTarget, element);
            // 显示模型数据
            textBoxTarget.Text = element.ToString();
        }

        private void CreatePictureForm(string elementId)
        {
            // 创建一个新的form来展示物件的2D截图
            var pictureForm = new GuiPicture(_formType, elementId, textBoxOut);
            pictureForm.ShowDialog();
        }

        private void LoadOriginAndTargetIconPic(PictureBox picture, JObject elementData, bool async = false)
        {
            var cachePath = BstManager.GetIconPath(elementData);
            if(!File.Exists(cachePath))
            {
                cachePath = BstManager.GetIconPath(elementData);
            }
            if (async)
            {
                MethodInvoker picUpdate = delegate
                {
                    if (File.Exists(cachePath))
                    {
                        picture.ImageLocation = cachePath;
                    }
                    else
                    {
                        picture.ImageLocation = BstManager.PathErrorIcon;
                    }
                    picture.Load();
                };
                picture.BeginInvoke(picUpdate);
            }
            else
            {
                if (File.Exists(cachePath))
                {
                    picture.ImageLocation = cachePath;
                }
                else
                {
                    picture.ImageLocation = BstManager.PathErrorIcon;
                }
                picture.Load();
            }
        }

    }
}
