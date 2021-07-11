using System;
using Newtonsoft.Json.Linq;

namespace BladeSoulTool.lib
{
    class I18NLoader
    {
        private static I18NLoader _instance;

        public static I18NLoader Instance 
        {
            get 
            {
                if (_instance == null)
                {
                    _instance = new I18NLoader();
                }
                return _instance;
            }
        }

        private JObject _i18n;

        private I18NLoader()
        {
            _i18n = Manager.Instance.DataI18N;
        }

        public string LoadI18NValue(string uiClassName, string key)
        {
            try
            {
                return (string) _i18n[uiClassName][key];
            }
            catch (Exception ex)
            {
                Logger.Log(ex.ToString());
                return null;
            }
        }

    }
}
