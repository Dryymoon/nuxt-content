<template>
  <client-only>
    <editor
      :is-loading="!loaded"
      :is-loaded="loaded"
      :is-editing="loaded"
      :value="value"
      :components="components"
      :variables="variables"
      :slots="slots"
      @input="onChange"
      @endEdit="endEdit"
    />
  </client-only>
</template>

<script>

import Editor from '<%= options.editor %>';
import debounce from "lodash/debounce";

export default {
  components: {
    Editor
  },
  props: {
    nuxtDocument: {
      required: true,
      type: Object,
      default() {
        return {};
      }
    },
    components: {
      type: Array,
      default() {
        return [];
      }
    },
    variables: {
      type: Array,
      default() {
        return [];
      }
    },
    slots: {
      type: Array,
      default() {
        return [];
      }
    }
  },
  watch: {
    nuxtDocument(v, oldV) {
      if (v === oldV) return;
      this.loaded = false;
      this.load();
    }
  },
  data() {
    return {
      loaded: false,
      value: '',
    }
  },
  created() {
    if (this.nuxtDocument) this.load();
    this.saveDebounced = debounce(this.save.bind(this), 250);
  },
  computed: {
    fileUrl() {
      return `/<%= options.apiPrefix %>${this.nuxtDocument.path}${this.nuxtDocument.extension}`
    },
  },
  methods: {
    onChange(value) {
      if (!this.loaded) return;
      this.value = value;
      this.saveDebounced();
    },
    async load() {
      this.value = await fetch(this.fileUrl).then(res => res.text())
      this.loaded = true;
    },
    async save() {
      await fetch(this.fileUrl, { method: 'PUT', body: JSON.stringify({ file: this.value }) })
        .then(res => res.json())
    },
    endEdit() {
      this.$nextTick(() => {
        this.$destroy();
      })
    }
  }
}

</script>
