using System;
using Newtonsoft.Json.Linq;

namespace BladeSoulTool.lib
{
    class I18NLoader
    {
        private static I18NLoader _instance;

        public static I18NLoader Instance => _instance ?? (_instance = new I18NLoader());

        private readonly JObject _i18n;

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
                Logger.Log(ex);
                return null;
            }
        }

    }
}
