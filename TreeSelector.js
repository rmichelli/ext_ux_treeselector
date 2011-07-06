/*
* Based on TreeSelector.js from Extjs Air 3.3.0 package
*
* @version 3.3.3 - modified from 3.2.2
* [For Use with ExtJS 3.3.3]
*/

// custom menu containing a single tree
Ext.menu.TreeMenu = Ext.extend(Ext.menu.Menu, {
    cls:'x-tree-menu',
    plain: true,

    constructor : function(config){
        Ext.menu.TreeMenu.superclass.constructor.call(this, config);
        this.add(config.tree);

        this.tree = config.tree;
        this.relayEvents(this.tree, ['selectionchange']);
    },

    // private
    beforeDestroy : function() {
        this.tree.destroy();
    }
});

// custom form field for displaying a tree, similar to select or combo
Ext.ux.TreeSelector = Ext.extend(Ext.form.TriggerField, {
    initComponent : function(){
        Ext.ux.TreeSelector.superclass.initComponent.call(this);
        this.addEvents('selectionchange');

        this.tree.getSelectionModel().on('selectionchange', this.onSelection, this);
        this.tree.on({
            'beforeexpandnode' : this.syncNodeDisplay,
            'expandnode': this.sync,
            'collapsenode' : this.sync,
            'append' : this.sync,
            'remove' : this.sync,
            'insert' : this.sync,
            'load'   : this.syncSelection,
            scope: this
        });

        // Ensure load syncSelection is always called first
        var ls = this.tree.events.load.listeners;
        if (ls && ls.length > 1) { ls.unshift(ls.pop()); }
    },

    sync : function(){
        if(this.menu && this.menu.isVisible()){
            if(this.tree.body.getHeight() > this.maxHeight){
                this.tree.body.setHeight(this.maxHeight);
                this.restricted = true;
            }else if(this.restricted && this.tree.body.dom.firstChild.offsetHeight < this.maxHeight){
                this.tree.body.setHeight('');
                this.restricted = false;
            }
            this.menu.el.sync();
        }
    },

    syncSelection: function(node){
        if(node === this.tree.getRootNode()){
            var sm = this.tree.getSelectionModel(),
            selNodes = (sm.getSelectedNode || sm.getSelectedNodes).call(sm),    // work with both default and multi selection models
            matchNode;

            if(Ext.isEmpty(selNodes)){
                selNodes = [];
            }
            if(!Ext.isArray(selNodes)) {
                selNodes = [selNodes];
            }

            sm.clearSelections();

            Ext.each(selNodes, function(item){
                matchNode = this.tree.getNodeById(item.id); // selections are stale, use id to locate and select actual node
                if(matchNode){
                    sm.select(matchNode);
                }
            }, this);
        }
    },

    syncNodeDisplay: function(node){
        if (!node.childrenRendered){
            var sm = this.tree.getSelectionModel();
            node.on('expand', function(){
                this.eachChild(function(child){
                    if(sm.isSelected(child) && child.rendered){
                        child.ui.addClass("x-tree-selected");   // adds selected display after child is rendered, as it can not be added prior
                    }
                });
            }, node, { single: true });
        }
    },

    onSelection : function(tree, node){
        if(!node){
            this.setRawValue('');
        }else{
            this.setRawValue(node.text);
        }
    },

    initEvents : function(){
        Ext.ux.TreeSelector.superclass.initEvents.call(this);
        this.el.on('mousedown', this.onTriggerClick, this);
        this.el.on('keydown', this.onKeyDown,  this);
    },

    onKeyDown : function(e){
        if(e.getKey() == e.DOWN){
            this.onTriggerClick();
        }
    },

    validateBlur : function(){
        return !this.menu || !this.menu.isVisible();
    },

    getValue : function(){
        var sm = this.tree.getSelectionModel();
        var s = sm.getSelectedNode();
        return s ? s.id : '';
    },

    setValue : function(id){
        var n = this.tree.getNodeById(id);
        if(n){
            n.select();
        }else{
            this.tree.getSelectionModel().clearSelections();
        }
    },

    // private
    onDestroy : function(){
        if(this.menu) {
            this.menu.destroy();
        }
        if(this.wrap){
            this.wrap.remove();
        }
        Ext.ux.TreeSelector.superclass.onDestroy.call(this);
    },

    // private
    collapseIf : function(e){
        if(!this.isDestroyed && !e.within(this.menu.el)){
            this.menu.hide();
        }
    },

    // private
    menuListeners : {
        show : function(){ // retain focus styling
            this.mon(Ext.getDoc(), 'mousewheel', this.collapseIf, this);
            this.onFocus();
        },
        hide : function(){
            this.focus.defer(10, this);
            var ml = this.menuListeners;
            this.menu.un('show', ml.show,  this);
            this.menu.un('hide', ml.hide,  this);
            this.mun(Ext.getDoc(), 'mousewheel', this.collapseIf, this);
        }
    },

    onTriggerClick : function(){
        if(this.disabled){
            return;
        }
        this.menu.on(Ext.apply({}, this.menuListeners, {
            scope:this
        }));

        this.menu.show(this.el, 'tl-bl?');
        this.sync();
        var sm = this.tree.getSelectionModel();
        var selected = sm.getSelectedNode();
        if(selected){
            selected.ensureVisible();
            if (typeof sm.activate == 'function') {     // sm.activate not defined for DefaultSelectionModel
                sm.activate.defer(250, sm, [selected]); // not modified to work with MultiSelectionModel
            }
        }
    },

    beforeBlur : function(){
        //
    },

    onRender : function(){
        Ext.ux.TreeSelector.superclass.onRender.apply(this, arguments);
        this.menu = new Ext.menu.TreeMenu(Ext.apply(this.menuConfig || {}, {tree: this.tree}));
        this.menu.on('beforeshow', function (menu) {
            // sync menu width with full width of field
            var cWidth = menu.el.getWidth(), dWidth = this.wrap.getWidth();
            if(cWidth !== dWidth){
                menu.el.setWidth(dWidth);
            }
            // patch for 3.3.3 where tree's toolbars may have 0 width
            var tWidth = this.tree.getWidth();
            Ext.each(this.tree.toolbars, function (tbar) {
                if(tbar.getWidth() !== tWidth){
                    tbar.setWidth(tWidth);
                    tbar.el.parent().setWidth(tWidth);
                }
            });
        }, this);
        this.menu.render();

        this.tree.body.addClass('x-tree-selector');
    },

    readOnly: true
});

// Custom tree keyboard navigation that supports node navigation without selection
//
// TO DO: Make this work with MultiSelectionModel

Ext.tree.ActivationModel = Ext.extend(Ext.tree.DefaultSelectionModel, {
    select : function(node){
        return this.activate(Ext.tree.ActivationModel.superclass.select.call(this, node));
    },

    activate : function(node){
        if(!node){
            return;
        }
        if(this.activated != node) {
            if(this.activated){
                this.activated.ui.removeClass('x-tree-activated');
            }
            this.activated = node;
            node.ui.addClass('x-tree-activated');
        }
        node.ui.focus();
        return node;
    },

    activatePrevious : function(){
        var s = this.activated;
        if(!s){
            return null;
        }
        var ps = s.previousSibling;
        if(ps){
            if(!ps.isExpanded() || ps.childNodes.length < 1){
                return this.activate(ps);
            } else{
                var lc = ps.lastChild;
                while(lc && lc.isExpanded() && lc.childNodes.length > 0){
                    lc = lc.lastChild;
                }
                return this.activate(lc);
            }
        } else if(s.parentNode && (this.tree.rootVisible || !s.parentNode.isRoot)){
            return this.activate(s.parentNode);
        }
        return null;
    },

    activateNext : function(){
        var s = this.activated;
        if(!s){
            return null;
        }
        if(s.firstChild && s.isExpanded()){
             return this.activate(s.firstChild);
         }else if(s.nextSibling){
             return this.activate(s.nextSibling);
         }else if(s.parentNode){
            var newS = null;
            s.parentNode.bubble(function(){
                if(this.nextSibling){
                    newS = this.getOwnerTree().selModel.activate(this.nextSibling);
                    return false;
                }
            });
            return newS;
         }
        return null;
    },

    onKeyDown : function(e){
        var s = this.activated;
        // undesirable, but required
        var sm = this;
        if(!s){
            return;
        }
        var k = e.getKey();
        switch(k){
             case e.DOWN:
                 e.stopEvent();
                 this.activateNext();
             break;
             case e.UP:
                 e.stopEvent();
                 this.activatePrevious();
             break;
             case e.RIGHT:
                 e.preventDefault();
                 if(s.hasChildNodes()){
                     if(!s.isExpanded()){
                         s.expand();
                     }else if(s.firstChild){
                         this.activate(s.firstChild, e);
                     }
                 }
             break;
             case e.LEFT:
                 e.preventDefault();
                 if(s.hasChildNodes() && s.isExpanded()){
                     s.collapse();
                 }else if(s.parentNode && (this.tree.rootVisible || s.parentNode != this.tree.getRootNode())){
                     this.activate(s.parentNode, e);
                 }
             break;
        }
    }
});

Ext.reg('Ext.ux.TreeSelector', Ext.ux.TreeSelector);
