
describe('CartoWizard', function() {
  var view, model, table;
  beforeEach(function() {
    model = new Backbone.Model();
    table = TestUtil.createTable('test');
    view = new cdb.admin.mod.CartoWizard({
      el: $('<div>'),
      model: model,
      table: table
    });
  });


  it('should add panels', function() {
    view.render();
    expect(_.keys(view.panels._subviews).length).toEqual(4);
  });

  it("should switch when click on tabs", function() {
    view.render();
    $(view.$el.find('.vis_options a')[0]).trigger('click');
    expect(view.panels.activeTab).toEqual('polygon');
  });

  it('when new style is generated and tab is active should set tile_style in the model', function() {
    // the table should not be empty
    table.data().create();
    spyOn(model, 'save');
    runs(function() {
      view.activated();
      view.cartoStylesGeneration.set({
        properties: {
          'marker-fill': '#FFF'
        }
      });
    });

    waits(700);

    runs(function() {
      expect(model.save).toHaveBeenCalled();
    });

  });

  it("when panel switch the tab should be selected", function() {
    view.render();
    view.panels.active('bubble');
    expect(view.$("a[href=#bubble]").hasClass('selected')).toEqual(true);
  });


  it("when style is updated the forms should be updated", function() {
    view.render();
    view.panels.active('choropleth');
    view.activated();
    // generate some carto to test
    var gen = new cdb.admin.CartoStyles({ table: table});
    gen.attr('polygon-fill', '#FFEE00');
    var custom_style = gen.get('style') + "\n #table::wadus { }";
    model.set({
      tile_style: custom_style,
      wizard_properties: gen.toJSON()
    });
    // test
    var color = view.panels.getPane('polygon').form.$('.color')[0];
    expect($(color).css('background-color')).toEqual('rgb(255, 238, 0)');

    //should never ever change the current style
    expect(model.get('tile_style')).toEqual(custom_style);

    //should active the generated tab
    expect(view.panels.activeTab).toEqual('polygon');
  });

  describe("ChoroplethWizard", function() {
    var view, model, table;
    beforeEach(function() {
      model = new Backbone.Model();
      table = new cdb.admin.CartoDBTableMetadata({ name: 'test_table', geometry_types: ['st_point'] });
      view = new cdb.admin.mod.CartoWizard({
        el: $('<div>'),
        model: model,
        table: table
      });
    });

    it("shouldn't activate choropleth due to the fact that table is made of points", function() {
      view.render();
      expect(view.tabs.$el.find('a.choropleth').lenth).toBeFalsy();
    });

  });

  describe("BubbleWizard", function() {
    var view, model, table;
    beforeEach(function() {
      table = TestUtil.createTable('test');
      model = new cdb.admin.CartoStyles({
        table: table
      });
      view = new cdb._BubbleWizard({
        table: table,
        model: model
      });
    });

    it("should re-render when table schema changes", function() {
      view.render();
      expect(view.$('option').length).toEqual(table.columnNamesByType('number').length);
      table.set({ schema: [['jaja', 'number']] });
      expect(view.$('option').length).toEqual(table.columnNamesByType('number').length);
    });

  });

});