/**
 * Created by bface007 on 11/08/2015.
 */
;(function ($, window, document, undefined) {

    /*
     * This module deals with the CSS transforms. As it is not possible to easily
     * combine the transform functions with JavaScript this module abstract those
     * functions and generates a raw transform matrix, combining the new transform
     * with the others that were previously applied to the element.
     *
     * Taken from jQuery Notebook 0.5 by Raphael Cruzeiro
     */
    var transform = (function() {
        var matrixToArray = function(str) {
            if (!str || str == 'none') {
                return [1, 0, 0, 1, 0, 0];
            }
            return str.match(/(-?[0-9\.]+)/g);
        };

        var getPreviousTransforms = function(elem) {
            return elem.css('-webkit-transform') || elem.css('transform') || elem.css('-moz-transform') ||
                elem.css('-o-transform') || elem.css('-ms-transform');
        };

        var getMatrix = function(elem) {
            var previousTransform = getPreviousTransforms(elem);
            return matrixToArray(previousTransform);
        };

        var applyTransform = function(elem, transform) {
            elem.css('-webkit-transform', transform);
            elem.css('-moz-transform', transform);
            elem.css('-o-transform', transform);
            elem.css('-ms-transform', transform);
            elem.css('transform', transform);
        };

        var buildTransformString = function(matrix) {
            return 'matrix(' + matrix[0] +
                ', ' + matrix[1] +
                ', ' + matrix[2] +
                ', ' + matrix[3] +
                ', ' + matrix[4] +
                ', ' + matrix[5] + ')';
        };

        var getTranslate = function(elem) {
            var matrix = getMatrix(elem);
            return {
                x: parseInt(matrix[4]),
                y: parseInt(matrix[5])
            };
        };

        var scale = function(elem, _scale) {
            var matrix = getMatrix(elem);
            matrix[0] = matrix[3] = _scale;
            var transform = buildTransformString(matrix);
            applyTransform(elem, transform);
        };

        var translate = function(elem, x, y) {
            var matrix = getMatrix(elem);
            matrix[4] = x;
            matrix[5] = y;
            var transform = buildTransformString(matrix);
            applyTransform(elem, transform);
        };

        var rotate = function(elem, deg) {
            var matrix = getMatrix(elem);
            var rad1 = deg * (Math.PI / 180);
            var rad2 = rad1 * -1;
            matrix[1] = rad1;
            matrix[2] = rad2;
            var transform = buildTransformString(matrix);
            applyTransform(elem, transform);
        };

        return {
            scale: scale,
            translate: translate,
            rotate: rotate,
            getTranslate: getTranslate
        };
    })();
    var pluginName = "bluRedactor",
        dataKey = "plugin_" + pluginName,
        isMac = window.navigator.platform == 'MacIntel',
        modifiers = {
            66: 'bold',
            73: 'italic',
            85: 'underline',
            112: 'h1',
            113: 'h2',
            114: 'h3',
            122: 'undo'
        },
        cache = {
            command: false,
            shift: false,
            isSelecting: false
        },
        utils = {
            keyboard: {
                isCommand: function(e, callbackTrue, callbackFalse) {
                    if (isMac && e.metaKey || !isMac && e.ctrlKey) {
                        callbackTrue();
                    } else {
                        callbackFalse();
                    }
                },
                isShift: function(e, callbackTrue, callbackFalse) {
                    if (e.shiftKey) {
                        callbackTrue();
                    } else {
                        callbackFalse();
                    }
                },
                isModifier: function(e, callback) {
                    var key = e.which,
                        cmd = modifiers[key];
                    if (cmd) {
                        callback(cmd);
                    }
                },
                isEnter: function(e, callback) {
                    if (e.which === 13) {
                        callback();
                    }
                },
                isArrow: function(e, callback) {
                    if (e.which >= 37 || e.which <= 40) {
                        callback();
                    }
                }
            },
            selection: {
                save: function () {
                    if(window.getSelection){
                        var sel = window.getSelection();
                        if(sel.rangeCount > 0)
                            return sel.getRangeAt(0);
                    }else if(document.selection && document.selection.createRange) // IE
                        return document.selection.createRange();
                    return null;
                },
                restore: function (range) {
                    if(range){
                        if(window.getSelection){
                            var sel = window.getSelection();
                            sel.removeAllRanges();
                            sel.addRange(range);
                        }else if(document.selection && range.select) // IE
                            range.select();
                    }
                },
                getText: function () {
                    var txt = '';
                    if(window.getSelection)
                        txt = window.getSelection().toString();
                    else if(document.getSelection)
                        txt = document.getSelection().toString();
                    else if(document.selection)
                        txt = document.selection.createRange().text;
                    return txt;
                },
                clear: function(){
                    if(window.getSelection){
                        if(window.getSelection().empty) // Chrome
                            window.getSelection().empty();
                        else if(window.getSelection().removeAllRanges) // Firefox
                            window.getSelection().removeAllRanges();
                        else if(document.selection) // IE ?
                            document.selection.empty();
                    }
                },
                getContainer: function(sel){
                    if(window.getSelection && sel && sel.commonAncestorContainer)
                        return sel.commonAncestorContainer;
                    else if(document.selection && sel && sel.parentElement)
                        return sel.parentElement();
                    return null;
                },
                getSelection: function () {
                    if(window.getSelection)
                        return window.getSelection();
                    else if(document.selection && document.selection.createRange) // IE
                        return document.selection;
                    return null;
                },
                getAnchorNode: function () {
                    return window.getSelection() ? window.getSelection().anchorNode : document.activeElement;
                }
            },
            html: {
                addTag: function (elem, tag, focus) {
                    var newElement = $(document.createElement(tag));
                    newElement.append(' ');
                    elem.append(newElement);
                    if(focus){
                        cache.focusedElement = newElement;
                        utils.cursor.set(elem, 0, cache.focusedElement);
                    }
                    return newElement;
                }
            },
            cursor: {
                set: function (editor, pos, elem) {
                    var range;
                    if(document.createRange){
                        range = document.createRange();
                        var selection = window.getSelection(),
                            lastChild = editor.children().last(),
                            length = lastChild.html().length - 1,
                            toModify = elem ? elem[0] : lastChild[0],
                            theLength = typeof pos !== 'undefined' ? pos : length;
                        range.setStart(toModify, theLength);
                        range.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }else {
                        range = document.body.createTextRange();
                        range.moveToElementText(elem);
                        range.collapse(false);
                        range.select();
                    }
                }
            },
            validation: {
                isUrl: function (url) {
                    return (/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/).test(url);
                }
            }
        };

    if( typeof index == 'undefined') var index = 0;
    index++;

    if( typeof TOOLBAR == 'undefined') var TOOLBAR = {};

    TOOLBAR["default"] = {
        floating: {
            bold: {
                title: "Gras",
                func: 'bold'
            },
            italic: {
                title: "Italique",
                func: 'italic'
            },
            strikethrough: {
                title: "Barré",
                func: 'strikethrough'
            }
        },
        navbar: {
            audio: {
                title: "Ajouter un fichier audio",
                func: "addAudio"
            },
            image: {
                title: "Ajouter une image",
                func: "addImage"
            },
            video: {
                title: "Ajouter une video",
                func: "addVideo"
            }
        }
    };

    var Command = function (BluRedactor){
        var self = this;

        self.$editor = BluRedactor.$editor;

        self.bold = setBold;
        self.italic = setItalic;
        self.strikethrough = setStrikethrough;
        self.undo = undo;

        self.addAudio = addAudio;
        self.addImage = addImage;
        self.addVideo = addVideo;

        this.change = change;


        function setBold(e){
            e.preventDefault();
            document.execCommand('bold', false);
            BluRedactor.Bubble.update();
            change()
        }
        function setItalic(e){
            e.preventDefault();
            document.execCommand('italic', false);
            BluRedactor.Bubble.update();
            change()
        }
        function setStrikethrough(e){
            e.preventDefault();
            document.execCommand('strikethrough', false);
            BluRedactor.Bubble.update();
            change()
        }

        function undo(e){
            e.preventDefault();
            document.execCommand('undo', false);
            var range = utils.selection.save(),
                boundary = range.getBoundingClientRect();
            $(document).scrollTop($(document).scrollTop() + boundary.top)
            BluRedactor.Command.change();
        }

        function addAudio(e){
            alert("audio")
        }
        function addImage(e){
            alert("image")
        }
        function addVideo(e){
            alert("video")
        }

        //
        function change(){
            var contentArea = BluRedactor.$textarea,
                editor = BluRedactor.$editor;
            contentArea.val(editor.html());
            var content = contentArea.val();
            var changeEvent = new CustomEvent("contentChange", { 'details': { 'content': content}});
            editor[0].dispatchEvent(changeEvent);
        }
    };

    var RawEvents = function (BluRedactor) {
        this.$editor = BluRedactor.$editor;
        this.keydown = keydown;
        this.keyup = keyup;
        this.focus = focus;
        this.mouseClick = mouseClick;
        this.mouseUp = mouseUp;
        this.mouseMove = mouseMove;
        this.blur = blur;

        var self = this;

        function keydown(e){
            utils.keyboard.isCommand(e, function () {
                cache.command = true;
            }, function () {
                cache.command = false;
            });

            utils.keyboard.isShift(e, function () {
                cache.shift = true;
            }, function () {
                cache.shift = false;
            });
            
            utils.keyboard.isModifier(e, function (cmd) {
                if(cache.command)
                    BluRedactor.Command[cmd](e);
            });

            if(cache.command && e.which === 65){
                setTimeout(function () {
                    BluRedactor.Bubble.show();
                }, 50);
            }

            if(cache.shift){
                utils.keyboard.isArrow(e, function () {
                    setTimeout(function () {
                        var txt = utils.selection.getText();
                        if(txt != '')
                            BluRedactor.Bubble.show();
                        else
                            BluRedactor.Bubble.clear();
                    }, 100)
                })
            }else{
                utils.keyboard.isArrow(e, function () {
                    BluRedactor.Bubble.clear();
                })
            }

            if(e.which === 13)
                BluRedactor.Editor.enterKey(e);

            if(e.which === 27)
                BluRedactor.Bubble.clear();

            if(e.which === 86 && cache.command)
                BluRedactor.Editor.paste(e);

            if(e.which === 90 && cache.command)
                BluRedactor.Command.undo(e);
        }

        function keyup(e){}

        function focus(e){}

        function mouseClick(e){}

        function mouseUp(e){}

        function mouseMove(e){}

        function blur(e){}
    };

    var Editor = function (BluRedactor) {

        this.$editor = BluRedactor.$editor;
        this.enterKey = enterKey;
        this.paste = paste;
        this.Events = new RawEvents(BluRedactor);

        var self = this;

        bindEvents();

        function enterKey(e){
            /* TODO editor-mode */

            var sel = utils.selection.getSelection(),
                elem = $(sel.focusNode.parentElement),
                nextElem = elem.next();
            if(!nextElem.length && elem.prop('tagName') != 'LI'){
                var tagName = elem.prop('tagName');
                if(tagName === 'OL' || tagName === 'UL'){
                    var lastLi = elem.children().last();
                    if(lastLi.length && lastLi.text === '')
                        lastLi.remove();
                }
                utils.html.addTag(self.$editor, 'p', true);
                e.preventDefault();
                e.stopPropagation();
            }
            BluRedactor.Command.change();
        }

        function paste(e){
            var id = "bluRedactor-temparea",
                range = utils.selection.save(),
                tempArea = $("#"+ id);
            if(tempArea.length < 1){
                var body = $('body');
                tempArea = $("<textarea>");
                tempArea.css({
                    position: "absolute",
                    left: -1000
                });
                tempArea.attr('id', id);
                body.append(tempArea);
            }
            tempArea.focus();
            
            setTimeout(function () {
                var clipboardContent = '',
                    paragraphs = tempArea.val().split('\n');
                for(var i = 0; i < paragraphs.length; i++)
                    clipboardContent += ['<p>', paragraphs[i], '</p>'].join('');
                tempArea.val('');
                utils.selection.restore(range);
                document.execCommand('delete');
                document.execCommand('insertHTML', false, clipboardContent);
                BluRedactor.Command.change();
            }, 500);
        }
        //
        function bindEvents (){
            self.$editor.keydown(self.Events.keydown);
        }
    };

    var Bubble = function(BluRedactor){
        this.$bubble = null;
        this.$box = BluRedactor.$box;
        var options = BluRedactor.options;

        var self = this;

        this.clear = clear;
        this.show = show;
        this.update = update;
        this.updatePos = updatePos;

        /*
         * This is called to position the bubble above the selection.
         */
        function updatePos () {
            var range = utils.selection.save(),
                boundary = range.getBoundingClientRect(),
                bubbleWidth = self.$bubble.width(),
                bubbleHeight = self.$bubble.height(),
                editorOffset = self.$box.find('.'+ pluginName +'_editor').offset(),
                pos = {
                    x: (boundary.left + boundary.width / 2) - (bubbleWidth / 2),
                    y: boundary.top - bubbleHeight - 8 + $(document).scrollTop()
                };
            transform.translate(self.$bubble, pos.x, pos.y);
        }

        function show (){
            self.$bubble = this.$box.find('.bubble');
            if(!self.$bubble.length){
                self.$bubble = utils.html.addTag(self.$box, 'div', false);
                self.$bubble.addClass(pluginName +'_bubble');
            }
            self.$bubble.empty();
            buildMenu(self.$box.find('.'+ pluginName +'_editor'), self.$bubble);
            self.$bubble.show();
            self.update();
            if(!self.$bubble.hasClass('active'))
                self.$bubble.addClass('jump');
            else
                self.$bubble.removeClass('jump');
            self.updatePos();
            self.$bubble.addClass('active');
        }
        
        function update () {
            updateState();
        }

        function clear(){
            var elem = self.$bubble = self.$box.find('.'+ pluginName +'_bubble');
            if(!elem.hasClass('active')) return;
            elem.removeClass('active');
            /* TODO hide input text for links*/
            /* TODO show buttons */
            setTimeout(function () {
                if(elem.hasClass('active')) return;
                elem.hide();
            }, 500)
        }

        /*
         * Updates the bubble to set the active formats for the current selection.
         */
         function updateState () {
            self.$bubble.find('a').removeClass('active');
            var sel = utils.selection.getSelection(),
                formats = [];
            checkForFormatting(sel.focusNode, formats);
            var formatDict = {
                'b': 'bold',
                'i': 'italic',
                'u': 'underline',
                'h1': 'h1',
                'h2': 'h2',
                'a': 'anchor',
                'ul': 'ul',
                'ol': 'ol'
            };
            for (var i = 0; i < formats.length; i++) {
                var format = formats[i];
                self.$bubble.find('a.' + formatDict[format]).addClass('active');
            }
        }
        /*
         * Recursively navigates upwards in the DOM to find all the format
         * tags enclosing the selection.
         */
        function checkForFormatting (currentNode, formats) {
            var validFormats = ['b', 'i', 'u', 'h1', 'h2', 'ol', 'ul', 'li', 'a'];
            if (currentNode.nodeName === '#text' ||
                validFormats.indexOf(currentNode.nodeName.toLowerCase()) != -1) {
                if (currentNode.nodeName != '#text') {
                    formats.push(currentNode.nodeName.toLowerCase());
                }
                checkForFormatting(currentNode.parentNode, formats);
            }
        }

        function buildMenu (editor, bubble) {
            var ul = utils.html.addTag(bubble, 'ul', false);
            $.each(TOOLBAR[options.toolbar].floating, function (key, s) {
                var li = utils.html.addTag(ul, 'li', false);
                var a = utils.html.addTag(li, 'a', false);
                a.attr('editor-command', s.func);
                a.addClass(key);
                a.append($('<i>').addClass(options.toolbarIcons.floating[key]));
            });
            bubble.find('a').click(function (e) {
                e.preventDefault();
                var cmd = $(this).attr('editor-command');
                BluRedactor.Command[cmd](e);
            });

            /* TODO add input text for links */
        }
    };

    var BluRedactor = function (element, options) {
        this.$element = element;
        this.options = options;
        this.$box = null;
        this.$editor = null;
        this.$toolbar = null;
        this.$textarea = null;

        this.Bubble = null;
        this.Command = null;
        this.Editor = null;

        var self = this;

        init();

        self.Bubble = new Bubble(self);
        self.Command = new Command(self);
        self.Editor = new Editor(self);

        function init(){
            self.$box = $("<div>").addClass(pluginName + "_box");
            self.$element.hide();
            self.$box.insertAfter(self.$element);
            // initialize toolbar
            generateToolbar();
            // Initialize Editor
            generateEditor();
            // Initialize textarea
            generateTextarea();
        }

        /*
            ================================================
            Initialize Toolbar
            ================================================
         */
        function generateToolbar(){
            if(self.options.toolbar === false ) return false;

            var toolbarWrapper = $("<div>").addClass("bluRedactor_toolbar_wrapper");

            self.$toolbar = $("<ul>").addClass(pluginName + "_toolbar");

            generateNavbar();

            self.$box.append($(toolbarWrapper).append(self.$toolbar));
        }
        function generateNavbar(){

            $.each(TOOLBAR[self.options.toolbar].navbar, function (key, s) {
                var li = $("<li>"),
                    a = buildNavbarButton(key, s);

                self.$toolbar.append($(li).append(a));
            })
        }
        function buildNavbarButton(key, value){
            var button = $('<a href="javascript:void(null);" title="'+ value.title +'" class="bluRedactor_toolbar_btn_'+ key +'"><i class="'+ self.options.toolbarIcons.navbar[key] +'"></i></a>');

            if(typeof value.func !== 'undefined')
                button.click(function (e) {
                    self.Command[value.func](e)
                });

            return button;
        }

        /*
            ================================================
            Initialize Editor
            ================================================
         */
        function generateEditor(){
            var editorWrapper = $("<div>").addClass("bluRedactor_editor_wrapper");

            self.$editor = $("<div>").addClass(pluginName + "_editor");

            self.$editor.attr("contentEditable", true);

            self.$editor.css("width", self.options.size.width !== null? self.options.size.width + "px" : "100%");
            self.$editor.css("height", self.options.size.height);

            self.$box.append($(editorWrapper).append(self.$editor));
        }

        /*
            ================================================
            Initialize Floatbar
            ================================================
         */
        function generateBubble(){

        }

        /*
            ================================================
            Initialize Textarea
            ================================================
         */
        function generateTextarea(){
            self.$textarea = $("<textarea name='"+ self.options.textarea +"' id='"+ pluginName +"_content_"+ index +"'></textarea>");

            self.$textarea.hide();

            self.$box.append(self.$textarea);
        }
    };

    var Plugin = function(element, options){

        this.$element = element;

        this.BluRedactor = null;

        this.options = {
            // default options
            lang: "fr",
            toolbar: "default",
            toolbarMode: "default",

            load: true,

            focus: true,
            resize: false,
            autoresize: false,
            convertDivs: true,
            convertLinks: true,

            size: {
                width: null,
                height: 400
            },
            fullscreen: false,
            overlay: true, // modal overlay

            colors: Array(
                '#ffffff', '#000000', '#eeece1', '#1f497d', '#4f81bd', '#c0504d', '#9bbb59', '#8064a2', '#4bacc6', '#f79646', '#ffff00',
                '#f2f2f2', '#7f7f7f', '#ddd9c3', '#c6d9f0', '#dbe5f1', '#f2dcdb', '#ebf1dd', '#e5e0ec', '#dbeef3', '#fdeada', '#fff2ca',
                '#d8d8d8', '#595959', '#c4bd97', '#8db3e2', '#b8cce4', '#e5b9b7', '#d7e3bc', '#ccc1d9', '#b7dde8', '#fbd5b5', '#ffe694',
                '#bfbfbf', '#3f3f3f', '#938953', '#548dd4', '#95b3d7', '#d99694', '#c3d69b', '#b2a2c7', '#b7dde8', '#fac08f', '#f2c314',
                '#a5a5a5', '#262626', '#494429', '#17365d', '#366092', '#953734', '#76923c', '#5f497a', '#92cddc', '#e36c09', '#c09100',
                '#7f7f7f', '#0c0c0c', '#1d1b10', '#0f243e', '#244061', '#632423', '#4f6128', '#3f3151', '#31859b', '#974806', '#7f6000'),
            toolbarIcons: {
                navbar: {
                    audio: "fa fa-music",
                    video: "fa fa-play",
                    image: "fa fa-camera"
                },
                floating: {
                    bold: "fa fa-bold",
                    italic: "fa fa-italic",
                    strikethrough: "fa fa-strikethrough",
                    alignCenter: "fa fa-align-center",
                    anchor: "fa fa-anchor",
                    ul: "fa fa-list-ul",
                    ol: "fa fa-list-ol",
                    sub: "fa fa-subscript",
                    sup: "fa fa-superscript",
                    table: "fa fa-table"
                }
            },

            textarea: 'bluRedactor_content',
            placeholder: 'Quoi de neuf docteur...',
            // private
            allEmptyHtml: "<p><br /></p>",
            mozillaEmptyHtml: "<p>&nbsp;</p>"
        };

        /**
         * Initialization
         */
        this.init(options);
    };

    Plugin.prototype = {
        // Initialize options
        init: function (options) {
            options = $.extend({}, this.options, options);

            this.BluRedactor = new BluRedactor(this.$element, options)
        }

    };

    /*
     * bluRedactor Wrapper
     * return plugin instance
     */
    $.fn[pluginName] = function (options, callback) {
        var plugin = this.data(dataKey);

        // has plugin instantiated ?
        if(plugin instanceof Plugin){
            // if have options arguments, call plugin.init() again
            plugin.init(options);
        }else{
            plugin = new Plugin(this, options);
            this.data(dataKey, plugin);
        }
        callback(plugin.BluRedactor.$editor);
        return plugin;
    }
}(jQuery, window, document));