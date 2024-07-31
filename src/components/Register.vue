<script lang="ts">
export default {
  name: "Register",
  data() {
    return {
      username: ""
    }
  },
  methods: {
    handleSubmit() {
      if (this.username) {
        this.$store.dispatch("setUsername", this.username);
        this.$router.push("/call");
      } else {
        alert("Username is not defined");
      }
    }
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <label for="username">Username:</label>
    <input type="text" id="username" placeholder="username" v-model="username">
    <button type="submit">Submit</button>
  </form>
</template>

<style scoped lang="scss">
/* Add your styles here */
</style>
