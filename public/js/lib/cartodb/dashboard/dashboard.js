/**
 *  entry point for dashboard
 */


$(function() {

    var Dashboard = cdb.core.View.extend({

        el: document.body,

        events: {
          'click a[href=#create_new]':  'show_dialog',
          'click':                      'onClickOut'
        },


        initialize: function() {
          this._initModels();
          this._initViews();
          this.tables.fetch();
        },

        _initModels: function() {
          this.tables = new cdb.admin.Tables();
        },

        _initViews: function() {
          this.tableList = new cdb.admin.dashboard.TableList({
            el: this.$('#tablelist'),
            model: this.tables
          });

          // this.tableStats = new cdb.admin.dashboard.TableStats({
          //   el: this.$('#tablelist'),
          //   model: this.tables
          // })

          // D3 API Requests
          var stats = this.stats = new cdb.admin.D3Stats({
            el: this.$("div.stats")
          });

          // User menu
          var user_menu = this.user_menu = new cdb.admin.UserMenu({
            target: 'a.account',
            model: {username: username},
            template_base: 'dashboard/views/settings_item'
          })
          .on("optionClicked",function(ev){})
          cdb.god.bind("closeDialogs", user_menu.hide, user_menu);
          this.$el.append(this.user_menu.render().el);

          // Bacground Importer
          var bkg_importer = this.bkg_importer = new cdb.ui.common.BackgroundImporter({
            status: 'uploading',
            template_base: 'common/views/background_importer'
          })
          this.$el.append(this.bkg_importer.render().el);

          // Tipsy
          this.$el.find("a.tooltip").tipsy({gravity: 's', fade:true, live:true});
        },

        show_dialog: function() {
          var dialog = new cdb.admin.CreateTableDialog();
          this.$el.append(dialog.render().el);
          dialog.open();
          dialog.bind('importStarted', this._importStarted, this);
        },

        _importStarted: function(imp) {
          //TODO: create dialog to show the import progress
          var self = this;
          imp.pollCheck();
          imp.bind('importComplete', function(){ 
            cdb.log.info("updating tables");
            self.tables.fetch();
            imp.unbind();
          });
        },

        onClickOut: function(ev) {
          cdb.god.trigger("closeDialogs");
        }
    });

    var DashboardRouter = Backbone.Router.extend({

        routes: {
            '/': 'index'
        },

        index: function() {
        }

    });

    cdb.init(function() {
      var dashboard = new Dashboard();
      var router = new DashboardRouter();
      // expose to debug
      window.dashboard = dashboard;
    });




});