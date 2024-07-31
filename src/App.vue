<template>
  <router-view></router-view>
</template>

<script>
import Register from "./components/Register.vue";
import Call from "./components/Call.vue";

export default {
  name: 'App',
  components: {
    Call,
    Register
  },
  computed: {
    isRegistered() {
      return this.$store.getters.isRegistered;
    }
  },
  beforeMount() {
    console.log(this.$store.getters.getUsername);
    if (!this.isRegistered)
      this.$router.push("/register");
    else this.$router.push("/call");
  }
}
</script>

<style lang="scss">
body {
  background: #595959
}
</style>