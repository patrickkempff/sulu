define(function(){"use strict";var a=function(){this.sandbox.on("husky.datagrid.item.click",function(a){this.sandbox.emit("sulu.contacts.contacts.load",a)},this),this.sandbox.on("sulu.list-toolbar.delete",function(){this.sandbox.emit("husky.datagrid.items.get-selected",function(a){this.sandbox.emit("sulu.contacts.contacts.delete",a)}.bind(this))},this),this.sandbox.on("sulu.list-toolbar.add",function(){this.sandbox.emit("sulu.contacts.contacts.new")},this)};return{view:!0,header:{title:"contact.contacts.title",noBack:!0,breadcrumb:[{title:"navigation.contacts"},{title:"contact.contacts.title"}]},templates:["/admin/contact/template/contact/list"],initialize:function(){this.render(),a.call(this)},render:function(){this.sandbox.dom.html(this.$el,this.renderTemplate("/admin/contact/template/contact/list")),this.sandbox.sulu.initListToolbarAndList.call(this,"contactsFields","/admin/api/contacts/fields",{el:this.$find("#list-toolbar-container"),instanceName:"contacts",inHeader:!0},{el:this.sandbox.dom.find("#people-list",this.$el),url:"/admin/api/contacts?flat=true",selectItem:{type:"checkbox"},removeRow:!1,searchInstanceName:"contacts",sortable:!0})}}});