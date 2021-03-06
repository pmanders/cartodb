
  /**
   *  Layer panel view added in the right menu
   *
   *  - It needs at least layer, visualization and user models.
   *    Globalerror to show connection or fetching errors.
   *
   *  var layer_view = new cdb.admin.LayerPanelView({
   *    model:        layer_model,
   *    vis:          vis_model,
   *    user:         user_model,
   *    globalError:  globalError_obj
   *  });
   */


  cdb.admin.LayerPanelView = cdb.admin.RightMenu.extend({

    _TEXTS: {
      error:  {
        default: _t('Something went wrong, try again later')
      }
    },

    MODULES: ['infowindow'],
    className: "layer_panel",

    events: {
      'click a.info':       '_switchTo',
      'click a.visibility': '_switchVisibility',
      'click a.remove':     '_removeLayer'
    },

    initialize: function() {
      cdb.admin.RightMenu.prototype.initialize.call(this);

      // Set internal vars
      this.table = this.model.table;
      this.sqlView = new cdb.admin.SQLViewData();
      this.map = this.options.vis.map;
      this.globalError = this.options.globalError;
      this.user = this.options.user;
      this.vis = this.options.vis;

      this.render();

      this.activeWorkView = 'table';
      this.currentPanelView;
      this.setDataLayer(this.model);

      // New added layers need to wait to get model id
      this.model.bind('change:id', function(m) {
        this.vis.save('active_layer_id', this.dataLayer.id);
        this.$el.attr('model-id', this.model.id);
      }, this);

      this.$el.attr('model-id', this.model.id);
    },


    /* Layer events functions */

    // Set active this tab
    _switchTo: function(e) {
      e.preventDefault();
      this.trigger('switchTo', this);
      this.filters._addFilters();
    },

    activated: function() {
      // remove layer_info
      this.deactivated();
      this.$el.html('');
      this.render();

      // Set data layer
      this.setDataLayer(this.model);

      // Set previous active layer
      this.setActivePanelView();

      this.panels.bind('tabEnabled', this.saveActivePanelView, this);
    },

    deactivated: function() {
      // Clean buttons (subviews)
      this.clearSubViews();
      // Reset local buttons array
      this.buttons = [];
      this.panels.unbind('tabEnabled', this.saveActivePanelView, this);
      this.panels.clean();
      this.tabs.clean();
    },

    // Set visibility of the map layer
    _switchVisibility: function(e) {
      if (!this.vis.isVisualization()) {
        cdb.log.info("You can't toggle the layer visibility in a table view");
        return false;
      }

      this.killEvent(e);
      this.model.save({ 'visible': !this.model.get('visible') });
    },

    // Remove this view and the map layer
    _removeLayer: function(e) {
      this.killEvent(e);

      // Check if the visualization is devired type and not table
      if (!this.vis.isVisualization()) {
        cdb.log.info("You can't remove a layer in a table view");
        return false;
      }

      this.trigger('delete', this);
    },


    /* Layer info functions (order, options, name, ...) */

    _setLayerInfo: function(layer) {
      this.setLayerName(layer);
      this.setLayerOptions(layer);
      this.setLayerOrder(layer);
      this.setVisibility(layer);
    },

    // Layer name
    setLayerName: function(layer) {
      this.$('.layer_info a.info .name').text(layer.get('table_name'));
    },

    // Layer options
    setLayerOptions: function(layer) {
      // Layer options buttons
      if (this.vis && !this.vis.isVisualization()) {
        this.$('.layer_info div.right').hide();
      } else {
        this.$('.layer_info div.right').show();
      }
    },

    setVisibility: function(layer) {
      this.$(".layer_info div.right a.switch")
        .removeClass('enabled disabled')
        .addClass(layer.get('visible') ? 'enabled' : 'disabled');
    },

    // Layer order
    setLayerOrder: function(layer) {
      var order = '1';
      if(this.vis.isVisualization()) {
        order = layer.collection.indexOf(layer);
      }

      this.$('.layer_info a.info .order').text(order);
    },


    /* Set data of the layer (bindings, errors, modules, ...) */
    setDataLayer: function(dataLayer) {
      var self = this;
      this.add_related_model(dataLayer);
      var enabledModulesInit = self.MODULES;
      if(!self.dataLayer) {
        self.dataLayer = dataLayer;
        this._initDataLayer(dataLayer);
      }

      // Set layer info
      this._setLayerInfo(dataLayer);

      /* SQL */
      var sql = new cdb.admin.mod.SQL({
        model: self.dataLayer
      });

      /* Filters */
      this.filters = new cdb.admin.mod.Filters({
        table: self.table,
        sqlView: self.sqlView,
        dataLayer: self.dataLayer
      });

      window.filters = this.filters;

      // load the scroll when the panel is open
      cdb.god.bind("end_narrow", function() {
        self.filters.loadScroll()
      }, this);

      /* Wizards */
      var activeWizards = {
        polygon:    "SimpleWizard",
        intensity:  "IntensityWizard",
        bubble:     "BubbleWizard",
        choropleth: "ChoroplethWizard",
        color:      "ColorMapWizard",
        density:    "DensityWizard"
      };

      var wizards = new cdb.admin.mod.CartoCSSWizard({
        model: self.dataLayer, // datalayer
        table: self.table,
        map: self.map,
        className: "wizards_panel",
        wizards: activeWizards
      }).bind('modules', function(enabledModules) {
        enabledModulesInit = enabledModules;
        self.enableModules(enabledModules);
      });

      /* Infowindow */
      var infowindow = new cdb.admin.mod.InfoWindow({
        table: self.table,
        model: dataLayer.infowindow
      });

      /* CartoCSS editor */
      var editorPanel = new cdb.admin.mod.CartoCSSEditor({
        model: self.dataLayer, // dataLayer
        table: self.table,
        className: "csseditor_panel"
      }).bind('hasErrors', function() {
        self.addClassToButton('cartocss_mod', 'has_errors');
      }).bind('clearError', function() {
        self.removeClassFromButton('cartocss_mod', 'has_errors');
      });

      self.addModule(sql.render(),          ['table', 'tableLite', 'map', 'mapLite']);
      self.addModule(wizards.render(),      ['map', 'mapLite']);
      self.addModule(infowindow.render(),   ['map', 'mapLite']);
      self.addModule(editorPanel.render(),  ['map', 'mapLite']);
      self.addModule(this.filters.render(), ['table', 'tableLite', 'map', 'mapLite']);

      /* Lateral menu modules */
      var mergeTables = self.addToolButton("merge_tables", 'table');
      var addRow = self.addToolButton('add_row', 'table');
      var addColumn = self.addToolButton('add_column', 'table');
      var addGeom = self.addToolButton('add_feature', 'map');

      addRow.bind('click', this._addRow, this);
      addColumn.bind('click', this._addColumn, this);
      mergeTables.bind('click', this._mergeTables, this);
      addGeom.bind('click', this._addFeature, this);

      this.enableModules(enabledModulesInit);
      this._bindDataLayer();
    },

    // set initial parameters to the layer
    _initDataLayer: function(layer) {
      layer.bind('change:table_name', this.setLayerName, this);
      layer.bind('change:order',      this.setLayerOrder, this);
      layer.bind('change:visible',    this.setVisibility, this);

      layer.set({
        user_name: this.user.get("username"),
        sql_api_domain: cdb.config.get('sql_api_domain'),
        sql_api_endpoint: cdb.config.get('sql_api_endpoint'),
        sql_api_port: cdb.config.get('sql_api_port'),
        tiler_domain: cdb.config.get('tiler_domain'),
        tiler_port: cdb.config.get('tiler_port'),
        tiler_protocol: cdb.config.get('tiler_protocol'),
        no_cdn: true
      });

      // set api key
      var e = layer.get('extra_params') || {};
      e.map_key = this.user.get('api_key');
      layer.set('extra_params', e);
      layer.invalidate();
    },

    // bind related ui changed to datalayer
    _bindDataLayer: function() {
      var self = this;
      this.dataLayer.bindSQLView(this.sqlView);
      this.dataLayer
        .bind('parseError', function() {
          if(self.activeWorkView == 'map') {
            self.globalError.showError('There is a problem with the map tiles. Please, check your CartoCSS style.', 'error', 0, 'tiles');
          }
        }, this)
        .bind('error', function() {
          if(self.activeWorkView == 'map') {
            self.globalError.showError('There is a problem with your connection', 'error', 0, 'tiles');
          }
        }, this)
        .bind('tileOk', function() {
          self.globalError.hide('tiles');
        }, this);

      this.table.bind('columnRename columnDelete columnAdded geolocated', function() {
        self.dataLayer.invalidate();
      }, this);

      this.dataLayer.bind('change:interactivity', function() {
        if(self.activeWorkView == 'map') {
          if(!this.dataLayer.get('interactivity')) {
            self.globalError.showError('interaction is disabled, select cartodb_id to enable it', 'warn', 0);
          } else {
            self.globalError.hide();
          }
        }
      }, this);

      this.vis.bind('change:type', this.setLayerOptions, this);

      this.model.bind('clearSQLView', this._onResetSQL, this);
      this.model.bind('applySQLView', this._onApplySQL, this);
      this.model.bind('errorSQLView', this._onErrorSQL, this);

      this.model.unbind('applyFilter', this._applyFilter, this);
      this.model.bind('applyFilter',  this._applyFilter, this);

      // Add related models to be cleaned when view is destroyed
      this.add_related_model(this.vis);
      this.add_related_model(this.table);
    },

    enableModules: function(enabledModules) {
      var self = this;
      _(self.MODULES).each(function(m) {
        if(_.contains(enabledModules, m)) {
          self.enableModule(m + "_mod");
        } else {
          self.disableModule(m + "_mod");
        }
      });
    },

    _onApplySQL: function() {
      this.addClassToButton('sql_mod', 'applied');
      this.removeClassFromButton('sql_mod', 'has_errors');
      this._readOnlyTableButtons();
    },

    _onErrorSQL: function() {
      this.addClassToButton('sql_mod', 'applied');
      this.addClassToButton('sql_mod', 'has_errors');
      this._readOnlyTableButtons();
    },

    _onResetSQL: function() {
      this.removeClassFromButton('sql_mod', 'applied');
      this.removeClassFromButton('sql_mod', 'has_errors');
      this._writableTableButtons();
    },

    _addRow: function() {
      this.table.data().addRow({ at: 0});
      this.trigger('createRow');
      cdb.god.trigger("closeDialogs");
    },

    _addColumn: function() {
      new cdb.admin.NewColumnDialog({
        table: this.table
      }).appendToBody().open();
      cdb.god.trigger("closeDialogs");
    },

    _mergeTables: function() {
      new cdb.admin.MergeTablesDialog({
        table: this.table
      }).appendToBody().open({ center:true });
      cdb.god.trigger("closeDialogs");
    },

    _addFeature: function(mod) {
      if (this.table.isGeoreferenced()) {
        this._addGeometry();
      } else {
        // Add feature dropdown
        // and removed it if it was created previously
        this.newGeomDropdown && this.newGeomDropdown.clean();
        this.newGeomDropdown = new cdb.admin.NewGeometryDropdown({
          position: 'position',
          template_base: "table/views/table_new_geom",
          tick: "bottom",
          horizontal_position: "right"
        });

        this.newGeomDropdown.bind('onDropdownHidden', function() {
          cdb.god.unbind(null, null, this.newGeomDropdown);
          this.newGeomDropdown && this.newGeomDropdown.clean();
        }, this);

        this.newGeomDropdown.bind('onDropdownShown', function() {
          cdb.god.unbind("closeDialogs", this.newGeomDropdown.hide, this.newGeomDropdown);
          cdb.god.trigger("closeDialogs");
          cdb.god.bind("closeDialogs", this.newGeomDropdown.hide, this.newGeomDropdown);
        }, this);

        this.newGeomDropdown.bind('newGeometry', function(geomType) {
          this._addGeometry(geomType);
        }, this);

        $('body').append(this.newGeomDropdown.render().el);

        var pos = this.tabs.getTab(mod).offset();
        this.newGeomDropdown.openAt(pos.left - 165, pos.top - 77);
      }
    },

    _addGeometry: function(type) {
      // row is saved by geometry editor if it is needed
      type = type || this.table.geomColumnTypes()[0];
      this.dataLayer.trigger("startEdition", type);
    },


    /* Module functions */

    // Enable the correct buttons depending on
    // if the layer is in query mode or not
    setActiveWorkView: function(workView) {
      this.activeWorkView = workView;
      if(this.table.isInSQLView()) {
        this._onApplySQL();
        this._readOnlyTableButtons();
      } else {
        this._onResetSQL();
        this._writableTableButtons();
      }

      this.setActivePanelView(true);
    },

    saveActivePanelView: function(name) {
      this.currentPanelView = name;
    },

    setActivePanelView: function(work_view) {
      if (work_view || !this.currentPanelView) {
        if (this.activeWorkView === 'map') {
          this.active('wizards_mod');
        } else {
          this.active('sql_mod');
        }
      } else {
        this.active(this.currentPanelView);
      }
    },

    _readOnlyTableButtons: function() {
      if(this.activeWorkView === 'map') {
        this.showTools('mapLite', true);
      } else {
        this.showTools('tableLite', true);
      }
    },

    _writableTableButtons: function() {
      if(this.activeWorkView === 'map') {
        this.showTools('map', true);
      } else {
        this.showTools('table', true);
      }
    },

    _applyFilter: function(column_name) {
      this.filters.filters.add({ column: column_name });
    },

    /* View visibility functions */

    hide: function() {
      this.$('.sidebar').hide();
      this.$('.views').hide();
    },

    show: function() {
      this.$('.sidebar').show();
      this.$('.views').show();
    },

    showModule: function(modName) {
      this._parent.show(modName + "_mod");
    },

    /* Clean layer */
    clean: function() {
      // More operations
      cdb.god.unbind("end_narrow", null, null, this);
      // Parent
      cdb.admin.RightMenu.prototype.clean.call(this);
    }
  });
