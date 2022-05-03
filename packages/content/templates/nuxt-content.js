import info from 'property-information'

const rootKeys = ['class-name', 'class', 'className', 'style']

const rxOn = /^@|^v-on:/
const rxBind = /^:|^v-bind:/
const rxModel = /^v-model/
const nativeInputs = ['select', 'textarea', 'input']
const valueRegXP = /{{(\s+)?(?<variable>[\S]+)(\s+)?}}/g
const valueRegXP2 = /\$(?<variable>\w+)/g

function evalInContext(code, context) {
  return new Function(`with(this) {
    if ( typeof(${code}) != 'undefined' ) return ( ${code} )
  }`).call(context)
}

function propsToData(node, doc, { extraVariables }) {
  const { tag, props } = node
  return Object.keys(props).reduce(function (data, key) {
    const k = key.replace(/.*:/, '')
    let obj = rootKeys.includes(k) ? data : data.attrs
    const value = props[key]
    const { attribute } = info.find(info.html, key)
    const native = nativeInputs.includes(tag)

    if (rxModel.test(key) && value in doc && !native) {
      const mods = key.replace(rxModel, '')
        .split('.')
        .filter(d => d)
        .reduce((d, k) => (d[k] = true, d), {})

      // As of yet we don't resolve custom v-model field/event names from components
      const field = 'value'
      const event = mods.lazy ? 'change' : 'input'
      const processor =
        mods.number ? (d => +d) :
          mods.trim ? (d => d.trim()) :
            d => d

      obj[field] = evalInContext(value, doc)
      data.on = data.on || {}
      data.on[event] = e => doc[value] = processor(e)
    } else if (key === 'v-bind') {
      const val = value in doc ? doc[value] : evalInContext(value, doc)
      // obj = Object.assign(obj, val)
      Object.assign(obj, val)
    } else if (rxOn.test(key)) {
      key = key.replace(rxOn, '')
      data.on = data.on || {}
      data.on[key] = evalInContext(value, doc)
    } else if (rxBind.test(key)) {
      key = key.replace(rxBind, '')
      obj[key] = value in doc
        ? doc[value]
        : value in extraVariables
          ? extraVariables[value]
          : evalInContext(value, doc)
    } else if (Array.isArray(value)) {
      obj[attribute] = value.join(' ')
    } else {
      obj[attribute] = value
    }
    return data
  }, { attrs: {} })
}

/**
 * Create the scoped slots from `node` template children. Templates for default
 * slots are processed as regular children in `processNode`.
 */
function slotsToData(node, h, doc, options) {
  const data = {}
  const children = node.children || []

  children.forEach((child) => {
    // Regular children and default templates are processed inside `processNode`.
    if (!isTemplate(child) || isDefaultTemplate(child)) {
      return
    }

    // Non-default templates are converted into slots.
    data.scopedSlots = data.scopedSlots || {}
    const template = child
    const name = getSlotName(template)
    const vDomTree = template.content.map(tmplNode => processNode(tmplNode, h, doc, options))
    data.scopedSlots[name] = function () {
      return vDomTree
    }
  })

  return data
}

function processNode(node, h, doc, options) {
  const { scopedSlots, extraVariables, changer } = options;
  // console.log(node.tag, node);

  /*
  a {
  type: 'element',
  tag: 'a',
  props: { href: '$registrationLink' },
  children: [ { type: 'text', value: 'Продолжить регистрацию' } ]
}
   */
  /**
   * Return raw value as it is
   */
  if (node.type === 'text') {

    let text = node.value

    if (extraVariables && Object.keys(extraVariables).length > 0) {
      text = text
        .replace(valueRegXP, (match, __, variable) => {
          if (!extraVariables.hasOwnProperty(variable)) return match
          return String(extraVariables[variable])
        })
        .replace(valueRegXP2, (match, __, variable) => {
          if (!extraVariables.hasOwnProperty(variable)) return match
          return String(extraVariables[variable])
        })
    }

    return text
  }

  /**
   * Populate vue slot
   */
  if (node.tag === 'slot') {
    const slotName = node.props.name || 'default'
    if (scopedSlots && scopedSlots[slotName]) return scopedSlots[slotName]()
    return
  }

  /**
   * Enhance node by function
   */
  if (changer) node = changer(node) || node;


  const slotData = slotsToData(node || {}, h, doc, options)
  const propData = propsToData(node || {}, doc, { extraVariables })
  const data = Object.assign({}, slotData, propData)

  /**
   * Process child nodes, flat-mapping templates pointing to default slots.
   */
  const children = []
  for (const child of node.children) {
    // Template nodes pointing to non-default slots are processed inside `slotsToData`.
    if (isTemplate(child) && !isDefaultTemplate(child)) {
      continue
    }

    const processQueue = isDefaultTemplate(child) ? child.content : [child]
    children.push(...processQueue.map(node => processNode(node, h, doc, options)))
  }

  return h(node.tag, data, children)
}

const DEFAULT_SLOT = 'default'

function isDefaultTemplate(node) {
  return isTemplate(node) && getSlotName(node) === DEFAULT_SLOT
}

function isTemplate(node) {
  return node.tag === 'template'
}

function getSlotName(node) {
  let name = ''
  for (const propName of Object.keys(node.props)) {
    if (!propName.startsWith('#') && !propName.startsWith('v-slot:')) {
      continue
    }
    name = propName.split(/[:#]/, 2)[1]
    break
  }
  return name || DEFAULT_SLOT
}

// <% if (options.watch && options.liveEdit) { %>

import Vue from 'vue';

const NCEditor = process.client ? require('./editor-runtime').default : null;

let NCEVueInstance;

const NCEVueComponent = Vue.extend(NCEditor);

function NCEStart(options) {
  if (NCEVueInstance) {
    Object.assign(NCEVueInstance, options);
    return ;
  }

  const el = document.createElement("div");
  el.setAttribute('nuxt-content-editor-mount-point', '');
  document.body.appendChild(el);

  NCEVueInstance = new NCEVueComponent({
    propsData: options,
    destroyed() {
      NCEVueInstance = undefined;
      if (this.$el) {
        this.$el.parentNode.removeChild(this.$el);
      } else {
        // If Vue dont mounted due to error, it prevent duplicate divs
        el.parentNode.removeChild(el);
      }
    }
  });

  NCEVueInstance.$mount(el);
}

// <% } %>

export default {
  name: 'NuxtContent',
  functional: true,
  // inheritAttrs: false,
  props: {
    document: {
      required: true
    },
    tag: {
      type: String,
      default: 'div'
    },
    changer: {
      type: Function,
    }
  },
  render(h, { data, props, scopedSlots, parent }) {
    const { document, tag, changer } = props
    const { body } = document || {}
    if (!body || !body.children || !Array.isArray(body.children)) {
      return
    }
    let classes = []
    if (Array.isArray(data.class)) {
      classes = data.class
    } else if (typeof data.class === 'object') {
      const keys = Object.keys(data.class)
      classes = keys.filter(key => data.class[key])
    } else {
      classes = [data.class]
    }
    data.class = classes.concat('nuxt-content')
    // data.props = Object.assign({ ...body.props }, data.props)
    data.props = {
      ...body.props,
      ...data.props
    };

    const extraVariables = {};
    Object.keys(data.attrs).forEach(key => {
      extraVariables[camelize(key)] = data.attrs[key];
    })

    data.attrs = {};

    // <% if (options.watch && options.liveEdit) { %>

    const origDblClick = data.on && data.on.dblclick;

    data.on = {
      ...data.on,
      dblclick: (event) => {
        if (origDblClick) origDblClick(event);

        // Omit self component from other local registered components
        const { [parent.$options.name]: _, ...localComponents } = parent.$options.components;

        const nuxtContentEl = event.target.closest('.nuxt-content');

        NCEStart({
          nuxtDocument: document,
          components: Object.keys(localComponents),
          variables: Object.keys(extraVariables),
          slots: Object.keys(scopedSlots),
          initialInteracted: [event.clientX, event.clientY],
          nuxtContentEl,
        });
      }
    }
    // <% } %>

    return h(
      tag,
      data,
      body.children.map(child => processNode(child, h, document, {
        scopedSlots,
        extraVariables,
        changer
      }))
    );
  }
}

function camelize(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
    return index === 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+/g, '');
}
