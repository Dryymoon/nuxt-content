<template>
  <client-only>
    <v-md-editor
      vif="value !== undefined"
      class="nuxtContentEditor"
      :value="value"
      @input="(v)=>$emit('input', v)"
      :left-toolbar="leftToolbar"
      :right-toolbar="rightToolbar"
      :toolbar="toolbar"
      mode="edit"
      :codemirror-config="{
        mode: 'yaml-frontmatter',
      }"
      ref="mdEditor"
    >
    </v-md-editor>
  </client-only>
</template>

<script>

import Vue from 'vue';
import VMdEditor from '@kangc/v-md-editor/lib/codemirror-editor';
import '@kangc/v-md-editor/lib/style/codemirror-editor.css';
import githubTheme from '@kangc/v-md-editor/lib/theme/github.js';
import '@kangc/v-md-editor/lib/theme/style/github.css';

// highlightjs
import hljs from 'highlight.js';

// Resources for the codemirror editor
import Codemirror from 'codemirror';
// mode
import 'codemirror/mode/markdown/markdown';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/css/css';
import 'codemirror/mode/htmlmixed/htmlmixed';
import 'codemirror/mode/vue/vue';


import 'codemirror/mode/gfm/gfm';
import 'codemirror/mode/yaml/yaml';
import 'codemirror/mode/yaml-frontmatter/yaml-frontmatter';

// edit
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/matchbrackets';
// placeholder
import 'codemirror/addon/display/placeholder';
// active-line
import 'codemirror/addon/selection/active-line';
// scrollbar
import 'codemirror/addon/scroll/simplescrollbars';
import 'codemirror/addon/scroll/simplescrollbars.css';
// style
import 'codemirror/lib/codemirror.css';

import enUS from '@kangc/v-md-editor/lib/lang/en-US';

VMdEditor.Codemirror = Codemirror;

VMdEditor.use(githubTheme, {
  Hljs: hljs,
});

VMdEditor.lang.use('en-US', enUS);

Vue.use(VMdEditor);

export default {
  props: {
    value: {
      required: true,
      type: String,
    },
    components: Array,
    variables: Array,
    slots: Array,
    initialInteracted: Array,
    isEditing: Boolean,
    nuxtContentEl: HTMLDivElement
  },
  inheritAttrs: false,
  data() {
    let availableViews = ['50-50', '50-50-scaled', 'fullscreen'];

    const wSesSt = window.sessionStorage.getItem('nuxt-content-editor-current-view');
    const wLocSt = window.localStorage.getItem('nuxt-content-editor-current-view');

    if (availableViews.includes(wSesSt)) {
      while (availableViews[0] !== wSesSt) {
        availableViews.push(availableViews.shift());
      }
    } else if (availableViews.includes(wLocSt)) {
      while (availableViews[0] !== wLocSt) {
        availableViews.push(availableViews.shift());
      }
    }

    return {
      availableViews
    };
  },
  watch: {
    isEditing(v, oldV) {
      if (!oldV && v) {
        this.$nextTick(() => {
          this.$refs.mdEditor.codemirrorInstance.clearHistory();
          this.$refs.mdEditor.codemirrorInstance.focus();
        });
      }
    },
    currentView(v, oldV) {
      document.body.removeAttribute('nuxt-content-editor-' + oldV);
      document.body.setAttribute('nuxt-content-editor-' + v, '');
      window.sessionStorage.setItem('nuxt-content-editor-current-view', v);
      window.localStorage.setItem('nuxt-content-editor-current-view', v);
    }
  },
  beforeMount() {
    if (this.currentView === '50-50') {

      const { left: elLeft, width: elWidth } = this.nuxtContentEl.getBoundingClientRect()

      const windowScrollTop = Math.floor(document.body.scrollTop ||
        document.documentElement.scrollTop ||
        document.body.parentNode.scrollTop
      );

      const screenWidth = window.innerWidth
        || document.documentElement.clientWidth
        || document.body.clientWidth;

      let scrollLeft = 0;
      let scrollTop = windowScrollTop;

      if (elWidth <= screenWidth / 2) {
        scrollLeft = elLeft + elWidth / 2 - screenWidth / 4;
      }

      if (elWidth > screenWidth / 2) {
        scrollLeft = elLeft - 20;
      }

      if (scrollLeft < 0) scrollLeft = 0;

      document.body.setAttribute('nuxt-content-editor-50-50', '');

      document.getElementById('__nuxt')
        .scrollTo({
          top: scrollTop,
          left: scrollLeft,
          behavior: 'instant',
        });
    }

    if (this.currentView === '50-50-scaled') {
      const windowScrollTop = Math.floor(document.body.scrollTop ||
        document.documentElement.scrollTop ||
        document.body.parentNode.scrollTop
      );

      const windowScrollLeft = Math.floor(document.body.scrollLeft ||
        document.documentElement.scrollLeft ||
        document.body.parentNode.scrollLeft
      );

      document.body.setAttribute('nuxt-content-editor-50-50-scaled', '');

      document.getElementById('__nuxt')
        .scrollTo({
          top: windowScrollTop,
          left: windowScrollLeft,
          behavior: 'instant',
        });
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.$refs.mdEditor.codemirrorInstance.focus();
    });
  },
  beforeDestroy() {
    const scrollTop = document.getElementById('__nuxt').scrollTop;
    // const scrollLeft = document.getElementById('__nuxt').scrollLeft;

    if (this.currentView === '50-50') {
      document.body.removeAttribute('nuxt-content-editor-50-50');
    }

    if (this.currentView === '50-50-scaled') {
      document.body.removeAttribute('nuxt-content-editor-50-50-scaled');
    }

    window.scrollTo({
      top: scrollTop,
      left: 0,
      behavior: 'instant',
    });

    document.body.getAttributeNames().forEach((attrName) => {
      if (attrName.startsWith('nuxt-content-editor')) {
        document.body.removeAttribute(attrName);
      }
    });
  },
  computed: {
    currentView() {
      return this.availableViews[0];
    },
    leftToolbar() {
      // https://code-farmer-i.github.io/vue-markdown-editor/api.html#left-toolbar
      return [
        'undo redo | h | bold italic strikethrough | table hr link image',
        this.components && this.components.length > 0 && 'components',
        this.variables && this.variables.length > 0 && 'variables',
        this.slots && this.slots.length > 0 && 'slots'
      ].filter(it => it).join(' ');
    },
    rightToolbar() {
      return 'changeView exit';
    },
    toolbar() {
      return {
        components: {
          text: 'C',
          title: 'Components',
          menus: Array.isArray(this.components) && this.components
            .map(cmpNameShakeCase => kebabCase(cmpNameShakeCase))
            .sort((a, b) => a.localeCompare(b))
            .map((cmpNameKebabCase) => ({
              text: cmpNameKebabCase,
              action(editor) {
                editor.insert(function (selected) {
                  const prefix = '<' + cmpNameKebabCase + '>';
                  const suffix = '</' + cmpNameKebabCase + '>';
                  const placeholder = ' ';
                  const content = selected || placeholder;

                  return {
                    text: `${prefix}${content}${suffix}`,
                    selected: content,
                  };
                });
              },
            }))
        },
        variables: {
          text: 'V',
          title: 'Variables',
          menus: Array.isArray(this.variables) && this.variables
            .sort((a, b) => a.localeCompare(b))
            .map(varName => ({
              text: varName,
              action(editor) {
                editor.insert(function () {
                  return {
                    text: `{{ ${varName} }}`,
                  };
                });
              },
            }))
        },
        slots: {
          text: 'S',
          title: 'Slots',
          menus: Array.isArray(this.slots) && this.slots
            .sort((a, b) => a.localeCompare(b))
            .map(slotName => ({
              text: slotName,
              action(editor) {
                editor.insert(function () {
                  let text = `<slot name="${slotName}"></slot>`;
                  if (slotName === 'default') text = '<slot></slot>';
                  return { text };
                });
              },
            }))
        },
        changeView: {
          title: 'Change screen size',
          icon: 'v-md-icon-fullscreen',
          action(editor) {
            // editor.$parent.$emit('endEdit');
            editor.$parent.changeView();
          },
        },
        exit: {
          title: 'Exit',
          icon: 'v-md-icon-open-in-new',
          action(editor) {
            editor.$parent.$emit('endEdit');
          },
        }
      }
    }
  },
  methods: {
    changeView() {
      this.availableViews.push(this.availableViews.shift());
    }
    /*
    TODO Implement Upload image handler in backend
    handleUploadImage(event, insertImage, files) {
      // Get the files and upload them to the file server, then insert the corresponding content into the editor
      console.log(files);

      // Here is just an example
      insertImage({
        url:
          'https://ss0.bdstatic.com/70cFvHSh_Q1YnxGkpoWK1HF6hhy/it/u=1269952892,3525182336&fm=26&gp=0.jpg',
        desc: 'desc',
        // width: 'auto',
        // height: 'auto',
      });
    }, */
  }
}

function kebabCase(string) {
  return string.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/\s+/g, '-').toLowerCase();
}

/* To add UPLOAD IMAGES support in editor add this lines
:disabled-menus="[]"
@upload-image="handleUploadImage"
 */

</script>

<style lang="css">
[nuxt-content-editor-50-50] #__nuxt {
  position: fixed;
  left: 50%;
  right: 0;
  top: 0;
  bottom: 0;
  overflow: auto;
}

[nuxt-content-editor-50-50] #__layout {
  min-width: 100vw;
}

[nuxt-content-editor-50-50-scaled] #__nuxt {
  position: fixed;
  left: 50%;
  right: -50%;
  top: 0;
  bottom: -100%;
  overflow: auto;
  transform: scale(0.5);
  transform-origin: 0 0;
}

.nuxtContentEditor {
  z-index: 10000000;
  position: fixed;
  top: 0;
  left: 0;
  right: 50%;
  bottom: 0;
  display: flex;
  transition: right 150ms;
  border-right: 1px solid lightgrey;
}

[nuxt-content-editor-fullscreen] .nuxtContentEditor {
  right: 0;
}

.nuxtContentEditor.v-md-editor {
  width: auto;
  box-shadow: unset;
  border-radius: unset;
}

.nuxtContentEditor.v-md-editor--fullscreen {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
}

.nuxtContentEditor.v-md-editor .codemirror-wrapper.codemirror-reset .CodeMirror pre {
  word-break: break-word;
}
</style>
