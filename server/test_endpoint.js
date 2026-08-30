import axios from 'axios';
axios.get('http://localhost:5001/api/public/service-categories')
  .then(res => console.log('service-categories:', res.data))
  .catch(err => console.error(err.message));
