using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
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

        private JObject _originSettings;

        private I18NLoader _i18N;

        private bool _loaded = false;

        public GuiItems(int formType)
        {
            InitializeComponent();
            InitI18N();
            Init(formType);
        }

        private void InitI18N()
        {
            _i18N = I18NLoader.Instance;
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
            _originSettings = Manager.ReadJsonFile(Manager.GetItemOriginJsonPath(_formType));
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

            // 种族选择控件
            // ReSharper disable once CoVariantArrayConversion
            comboBoxRace.Items.AddRange(Manager.Instance.RaceNames.ToArray());
            comboBoxRace.SelectedIndex = 0;
            comboBoxRace.SelectedIndexChanged += comboBoxRace_SelectedIndexChanged;

            // 查找模型控件
            btnFilter.Click += btnFilter_Click;

            // 全部恢复按钮
            btnTopRestoreAll.Click += btnTopRestoreAll_Click;
            // 预览原始模型2D截图
            btnView2DOrigin.Click += btnView2DOrigin_Click;
            // 预览原始模型3D模型
            btnView3DOrigin.Click += btnView3DOrigin_Click;
            // 预览目标模型2D截图
            btnView2DTarget.Click += btnView2DTarget_Click;
            // 预览目标模型3D模型
            btnView3DTarget.Click += btnView3DTarget_Click;
            // 替换按钮
            btnReplace.Click += btnReplace_Click;

            // 展示选中物件的3D模型按钮
            btnView3DInfo.Click += btnView3DInfo_Click;
            // 选为原始模型按钮
            btnSelectOrigin.Click += btnSelectOrigin_Click;
            // 选为目标模型按钮
            btnSelectTarget.Click += btnSelectTarget_Click;
        }
        
        public void Load()
        {
            if (_loaded) return;
            
            LoadItemList();
        }

        private void LoadItemList(int raceType = Manager.RaceIdKunn)
        {
            ClearFormStatus(); // 清理旧的数据

            Task.Run(() =>
            {
                Manager.ShowMsgInTextBox(textBoxOut, _i18N.LoadI18NValue("GuiItems", "logStartToLoadDataList"));

                //BstManager.HideDataGridViewVerticalScrollBar(this.gridItems); // 隐藏滚动条

                // 更新原始模型区块数据
                JObject originData = null;
                if (_formType == Manager.TypeAttach
                    || _formType == Manager.TypeCostume)
                {
                    var race = Manager.Instance.RaceTypes[raceType];
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
                    Manager.ShowMsgInTextBox(textBoxOrigin, originData.ToString(), false);
                }

                // 初始化list数据
                switch (_formType)
                {
                    case Manager.TypeCostume:
                        _data = Manager.Instance.GetCostumeDataByRace(raceType);
                        break;
                    case Manager.TypeAttach:
                        _data = Manager.Instance.GetAttachDataByRace(raceType);
                        break;
                    case Manager.TypeWeapon:
                        _data = Manager.Instance.DataWeapon;
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
                    _dataTable.Rows.Add(new object[] { Manager.Instance.LoadingGifBytes, elementId }); 
                    var rowId = _dataTable.Rows.Count - 1;
                    IconLoader.Instance.RegisterTask(new IconLoadTask(
                        elementData, gridItems, _dataTable, rowId, textBoxOut
                    ));
                }

                Manager.ShowMsgInTextBox(textBoxOut, _i18N.LoadI18NValue("GuiItems", "logEndLoadDataList"));
                IconLoader.Instance.Start(); // 启动图片加载器
            });
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
            IconLoader.Instance.Stop();
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
            PicLoader.LoadPic(_formType, elementData, pictureBoxUmodel, textBoxOut);
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
                    PicLoader.LoadPic(_formType, elementData, pictureBoxUmodel, textBoxOut);
                    // 更新列表展示位置
                    gridItems.FirstDisplayedScrollingRowIndex = i;
                    break;
                }
            }
        }

        private void btnTopRestoreAll_Click(Object sender, EventArgs e)
        {
            // 恢复全部模型
            if (Manager.DisplayConfirmMessageBox(
                _i18N.LoadI18NValue("GuiItems", "actionConfirmTitle"),
                _i18N.LoadI18NValue("GuiItems", "actionRestoreMsg")) == DialogResult.OK)
            {
                Manager.Instance.RunGrunt(textBoxOut, true, "restore");
            }
        }

        private void btnView2DOrigin_Click(Object sender, EventArgs e)
        {
            // 预览原始模型2D截图
            if (_originElementId == null)
            {
                Manager.DisplayErrorMessageBox(
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
                Manager.DisplayErrorMessageBox(
                    _i18N.LoadI18NValue("GuiItems", "actionSelectErrorTitle"),
                    _i18N.LoadI18NValue("GuiItems", "actionSelectOriginErrorMsg")
                );
                return;
            }
            Manager.Instance.RunGrunt(textBoxOut, false, "upk_viewer", new string[]
            {
                "--part=" + Manager.GetTypeName(_formType),
                "--model=" + _originElementId
            });
        }

        private void btnView2DTarget_Click(Object sender, EventArgs e)
        {
            // 预览目标模型2D截图
            if (_targetElementId == null)
            {
                Manager.DisplayErrorMessageBox(
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
                Manager.DisplayErrorMessageBox(
                    _i18N.LoadI18NValue("GuiItems", "actionSelectErrorTitle"),
                    _i18N.LoadI18NValue("GuiItems", "actionSelectTargetErrorMsg")
                );
                return;
            }
            Manager.Instance.RunGrunt(textBoxOut, false, "upk_viewer", new string[]
            {
                "--part=" + Manager.GetTypeName(_formType),
                "--model=" + _targetElementId
            });
        }

        private void btnReplace_Click(Object sender, EventArgs e)
        {
            // 替换模型
            if (_originElementId == null)
            {
                Manager.DisplayErrorMessageBox(
                    _i18N.LoadI18NValue("GuiItems", "actionReplaceErrorTitle"),
                    _i18N.LoadI18NValue("GuiItems", "actionOriginEmptyErrorMsg")
                );
                return;
            }
            if (_targetElementId == null)
            {
                Manager.DisplayErrorMessageBox(
                    _i18N.LoadI18NValue("GuiItems", "actionReplaceErrorTitle"),
                    _i18N.LoadI18NValue("GuiItems", "actionTargetEmptyErrorMsg")
                );
                return;
            }
            if (_originElementId == _targetElementId)
            {
                Manager.DisplayErrorMessageBox(
                    _i18N.LoadI18NValue("GuiItems", "actionReplaceErrorTitle"),
                    _i18N.LoadI18NValue("GuiItems", "actionTargetSameErrorMsg")
                );
                return;
            }
            if (_formType == Manager.TypeWeapon) // 只有武器不可替换
            {
                // FIXME 后续制作功能，并开发这个限制
                Manager.DisplayErrorMessageBox(
                    _i18N.LoadI18NValue("GuiItems", "actionFuncNotDoneTitle"),
                    _i18N.LoadI18NValue("GuiItems", "actionWaitForFuncMsg")
                );
                return;
            }
            if (Manager.DisplayConfirmMessageBox(
                _i18N.LoadI18NValue("GuiItems", "actionConfirmTitle"),
                _i18N.LoadI18NValue("GuiItems", "actionReplaceMsg")) == DialogResult.OK)
            {
                string race = null;
                if (_formType == Manager.TypeAttach
                    || _formType == Manager.TypeCostume)
                {
                    race = Manager.Instance.RaceTypes[comboBoxRace.SelectedIndex];
                }
                Manager.Instance.RunGrunt(textBoxOut, false, "replace", new string[]
                {
                    "--part=" + Manager.GetTypeName(_formType),
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
                Manager.DisplayErrorMessageBox(
                    _i18N.LoadI18NValue("GuiItems", "actionSelectErrorTitle"),
                    _i18N.LoadI18NValue("GuiItems", "actionSelectTargetErrorMsg")
                );
                return;
            }
            Manager.Instance.RunGrunt(textBoxOut, false, "upk_viewer", new string[]
            {
                "--part=" + Manager.GetTypeName(_formType),
                "--model=" + _selectedElementId
            });
        }

        private void btnSelectOrigin_Click(Object sender, EventArgs e)
        {
            // 将当前选中的物件设为原始模型
            if (_selectedElementId == null)
            {
                Manager.DisplayErrorMessageBox(
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
            if (_formType == Manager.TypeAttach
                || _formType == Manager.TypeCostume)
            {
                var originRace = (string) element["race"];
                if (Regex.IsMatch(originRace, Manager.Instance.RaceTypes[Manager.RaceIdLyn], RegexOptions.IgnoreCase))
                {
                    originRace = Manager.Instance.RaceTypes[Manager.RaceIdLyn];
                }
                _originSettings[originRace] = originData;
            }
            else
            {
                _originSettings = originData;
            }
            Manager.WriteJsonFile(Manager.GetItemOriginJsonPath(_formType), _originSettings);
        }

        private void btnSelectTarget_Click(Object sender, EventArgs e)
        {
            // 将当前选中的物件设为目标模型
            if (_selectedElementId == null)
            {
                Manager.DisplayErrorMessageBox(
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
            var cachePath = Manager.GetIconPath(elementData);
            if(!File.Exists(cachePath))
            {
                cachePath = Manager.GetIconPath(elementData);
            }
            if (async)
            {
                picture.TryBeginInvoke(() =>
                {
                    picture.ImageLocation = File.Exists(cachePath) ? cachePath : Manager.PathErrorIcon;
                    picture.Load();
                });
            }
            else
            {
                picture.ImageLocation = File.Exists(cachePath) ? cachePath : Manager.PathErrorIcon;
                picture.Load();
            }
        }

    }
}
