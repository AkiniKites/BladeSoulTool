﻿using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Text;
using System.Windows.Forms;

namespace BladeSoulTool
{

    public partial class GUI : Form
    {
        private const int FORM_TYPE_COSTUME = 0;
        private const int FORM_TYPE_ATTACH = 1;
        private const int FORM_TYPE_WEAPON = 2;
        private const int FORM_TYPE_UTIL = 3;

        private Form formCostume;
        private Form formAttach;
        private Form formWeapon;
        private Form formUtil;

        public GUI()
        {
            InitializeComponent();
            init();
        }

        private void init()
        {
            // 初始化第一个tab，costume
            this.formCostume = this.createItemsForm();
            this.tabCostume.Controls.Add(this.formCostume);
        }

        private Form createItemsForm()
        {
            Form form = new GUI_Items();
            form.TopLevel = false;
            form.BackColor = Color.Green; // for test, remove later
            form.Visible = true;
            form.FormBorderStyle = FormBorderStyle.None;
            form.WindowState = FormWindowState.Maximized;

            return form;
        }
    }
}
