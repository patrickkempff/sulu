/*
 * This file is part of the Sulu CMS.
 *
 * (c) MASSIVE ART WebServices GmbH
 *
 * This source file is subject to the MIT license that is bundled
 * with this source code in the file LICENSE.
 */

define([], function() {

    'use strict';

    var form = '#contact-form',
        fields = ['urls', 'emails', 'faxes', 'phones', 'notes', 'addresses'],

        constants = {
            tagsId: '#tags'
        },

        setHeaderToolbar = function() {
            this.sandbox.emit('sulu.header.set-toolbar', {
                template: 'default'
            });
        };

    return (function() {
        return {

            view: true,

            templates: ['/admin/contact/template/contact/form'],

            initialize: function() {
                this.saved = true;
                this.formId = '#contact-form';
                this.autoCompleteInstanceName = 'accounts-';

                this.dfdListenForChange = this.sandbox.data.deferred();
                this.dfdFormIsSet = this.sandbox.data.deferred();

                this.setTitle();
                this.render();
                this.setHeaderBar(true);
                setHeaderToolbar.call(this);
                this.listenForChange();
            },

            render: function() {
                this.sandbox.once('sulu.contacts.set-defaults', this.setDefaults.bind(this));
                this.sandbox.once('sulu.contacts.set-types', this.setTypes.bind(this));

                this.sandbox.dom.html(this.$el, this.renderTemplate('/admin/contact/template/contact/form'));

                this.sandbox.on('husky.dropdown.type.item.click', this.typeClick.bind(this));

                var data = this.initContactData();

                this.companyInstanceName = 'companyContact' + data.id;

                this.sandbox.start([
                    {
                        name: 'auto-complete@husky',
                        options: {
                            el: '#company',
                            remoteUrl: '/admin/api/accounts?searchFields=id,name&flat=true',
                            getParameter: 'search',
                            value: data.account,
                            instanceName: this.companyInstanceName,
                            valueName: 'name',
                            noNewValues: true
                        }
                    }
                ]);

                this.initForm(data);

                this.setTags(data);

                this.bindDomEvents();
                this.bindCustomEvents();
                this.bindTagEvents(data);
            },

            /**
             * Sets the title to the username
             * default title as fallback
             */
            setTitle: function() {
                var title = this.sandbox.translate('contact.contacts.title'),
                    breadcrumb = [
                        {title: 'navigation.contacts'},
                        {title: 'contact.contacts.title', event: 'sulu.contacts.contacts.list'}
                    ];

                if (!!this.options.data && !!this.options.data.id) {
                    title = this.options.data.fullName;
                    breadcrumb.push({title: '#' + this.options.data.id});
                }

                this.sandbox.emit('sulu.header.set-title', title);
                this.sandbox.emit('sulu.header.set-breadcrumb', breadcrumb);
            },

            // show tags and activate keylistener
            setTags: function() {
                var uid = this.sandbox.util.uniqueId();
                if (this.options.data.id) {
                    uid +=  '-' + this.options.data.id;
                }
                this.autoCompleteInstanceName += uid;

                this.dfdFormIsSet.then(function() {
                    this.sandbox.start([
                        {
                            name: 'auto-complete-list@husky',
                            options: {
                                el: '#tags',
                                instanceName: this.autoCompleteInstanceName,
                                getParameter: 'search',
                                remoteUrl: '/admin/api/tags?flat=true&sortBy=name',
                                completeIcon: 'tag',
                                noNewTags: true
                            }
                        }
                    ]);
                }.bind(this));
            },

            bindTagEvents: function(data) {
                if (!!data.tags && data.tags.length > 0) {
                    // set tags after auto complete list was initialized
                    this.sandbox.on('husky.auto-complete-list.' + this.autoCompleteInstanceName + '.initialized', function() {
                        this.sandbox.emit('husky.auto-complete-list.' + this.autoCompleteInstanceName + '.set-tags', data.tags);
                    }.bind(this));
                    // listen for change after items have been added
                    this.sandbox.on('husky.auto-complete-list.' + this.autoCompleteInstanceName + '.items-added', function() {
                        this.dfdListenForChange.resolve();
                    }.bind(this));
                } else {
                    this.dfdListenForChange.resolve();
                }
            },

            setDefaults: function(defaultTypes) {
                this.defaultTypes = defaultTypes;
            },

            /**
             * is getting called when template is initialized
             * @param types
             */
            setTypes: function(types) {
                this.fieldTypes = types;
            },

            setFormData: function(data) {

                // add collection filters to form
                this.sandbox.emit('sulu.contact-form.add-collectionfilters', form);
                this.sandbox.form.setData(form, data).then(function() {
                        this.sandbox.start(form);
                        this.sandbox.emit('sulu.contact-form.add-required', ['email']);
                        this.dfdFormIsSet.resolve();
                    }.bind(this)).fail(function(error) {
                        this.sandbox.logger.error("An error occured when setting data!", error);
                    }.bind(this));
            },

            initForm: function(data) {
                // when  contact-form is initalized
                this.sandbox.on('sulu.contact-form.initialized', function() {
                    // set form data
                    var formObject = this.sandbox.form.create(form);
                    formObject.initialized.then(function() {
                        this.setFormData(data);
                    }.bind(this));
                }.bind(this));

                // initialize contact form
                this.sandbox.start([
                    {
                        name: 'contact-form@sulucontact',
                        options: {
                            el: '#contact-edit-form',
                            fieldTypes: this.fieldTypes,
                            defaultTypes: this.defaultTypes
                        }
                    }
                ]);
            },

            bindDomEvents: function() {
            },

            bindCustomEvents: function() {
                // delete contact
                this.sandbox.on('sulu.header.toolbar.delete', function() {
                    this.sandbox.emit('sulu.contacts.contact.delete', this.options.data.id);
                }, this);

                // contact saved
                this.sandbox.on('sulu.contacts.contacts.saved', function(data) {
                    this.options.data = data;
                    this.initContactData();
                    this.setHeaderBar(true);
                }, this);

                // contact save
                this.sandbox.on('sulu.header.toolbar.save', function() {
                    this.submit();
                }, this);

                // back to list
                this.sandbox.on('sulu.header.back', function() {
                    this.sandbox.emit('sulu.contacts.contacts.list');
                }, this);
            },

            initContactData: function() {
                var contactJson = this.options.data;

                this.sandbox.util.foreach(fields, function(field) {
                    if (!contactJson.hasOwnProperty(field)) {
                        contactJson[field] = [];
                    }
                });

                contactJson.emails = this.fillFields(contactJson.emails, 1, {
                    id: null,
                    email: '',
                    emailType: this.defaultTypes.emailType
                });
                contactJson.phones = this.fillFields(contactJson.phones, 1, {
                    id: null,
                    phone: '',
                    phoneType: this.defaultTypes.phoneType
                });
                contactJson.faxes = this.fillFields(contactJson.faxes, 1, {
                    id: null,
                    fax: '',
                    faxType: this.defaultTypes.faxType
                });
                contactJson.notes = this.fillFields(contactJson.notes, 1, {
                    id: null,
                    value: ''
                });
                contactJson.urls = this.fillFields(contactJson.urls, 0, {
                    id: null,
                    url: '',
                    urlType: this.defaultTypes.urlType
                });

                return contactJson;
            },

            typeClick: function(event, $element) {
                this.sandbox.logger.log('email click', event);
                $element.find('*.type-value').data('element').setValue(event);
            },

            /**
             * Takes an array of fields and fields it up with empty fields till a minimum amount
             * @param field {Object} array of fields to manipulate
             * @param minAmount {Number} minimum amount of fields to exist
             * @param value {Object} empty object to insert (for minimum amount of fields)
             * @returns {Object} manipulated fields array
             */
            fillFields: function(field, minAmount, value) {
                var i = -1, length = field.length, attributes;

                // if minimum fields stated is bigger than the actual length loop more times
                if (length < minAmount) {
                    length = minAmount;
                }

                for (; ++i < length;) {
                    // construct the attributes object for fields under and equal the minimum amount
                    if ((i + 1) > minAmount) {
                        attributes = {};
                    } else {
                        attributes = {
                            permanent: true
                        };
                    }

                    // if no more fields exists push new, empty fields
                    if (!field[i]) {
                        field.push(value);
                        field[field.length - 1].attributes = attributes;
                    } else {
                        field[i].attributes = attributes;
                    }
                }

                return field;
            },

            submit: function() {
                this.sandbox.logger.log('save Model');

                if (this.sandbox.form.validate(form)) {
                    var data = this.sandbox.form.getData(form);

                    if (data.id === '') {
                        delete data.id;
                    }

                    data.tags = this.sandbox.dom.data(this.$find(constants.tagsId), 'tags');

                    // FIXME auto complete in mapper
                    data.account = {
                        id: this.sandbox.dom.attr('#' + this.companyInstanceName, 'data-id')
                    };

                    this.sandbox.logger.log('log data', data);
                    this.sandbox.emit('sulu.contacts.contacts.save', data);
                }
            },

            // @var Bool saved - defines if saved state should be shown
            setHeaderBar: function(saved) {
                if (saved !== this.saved) {
                    var type = (!!this.options.data && !!this.options.data.id) ? 'edit' : 'add';
                    this.sandbox.emit('sulu.header.toolbar.state.change', type, saved, true);
                }
                this.saved = saved;
            },

            listenForChange: function() {
                this.dfdListenForChange.then(function() {
                    this.sandbox.dom.on('#contact-form', 'change', function() {
                        this.setHeaderBar(false);
                    }.bind(this), "select, input, textarea");
                    this.sandbox.dom.on('#contact-form', 'keyup', function() {
                        this.setHeaderBar(false);
                    }.bind(this), "input, textarea");
                    this.sandbox.on('sulu.contact-form.changed', function() {
                        this.setHeaderBar(false);
                    }.bind(this));
                }.bind(this));
                this.sandbox.on('husky.select.form-of-address.selected.item', function() {
                    this.setHeaderBar(false);
                }.bind(this));
            }
        };
    })();
});
