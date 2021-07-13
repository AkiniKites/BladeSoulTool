using System.Data;
using System.Windows.Forms;
using Newtonsoft.Json.Linq;

namespace BladeSoulTool.lib
{
    public class IconLoadTask
    {
        public JObject ElementData { get; set; } // JObject element data
        public DataTable Table; // DataTable contains the pic
        public int RowId { get; set; } // DataTable line to be updated
        public int ColId { get; set; } // DataTable column to be updated

        public IconLoadTask(JObject elementData, DataTable table, int rowId = 0, int colId = 0)
        {
            ElementData = elementData;
            Table = table;
            RowId = rowId;
            ColId = colId;
        }
    }
}
